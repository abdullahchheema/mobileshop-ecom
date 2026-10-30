import "server-only";
import { verifySignature } from "@/lib/payments/signature";
import { type GatewayEvent, PaymentGatewayError, type PaymentProvider, type PaymentState } from "@/lib/payments/types";

// Safepay hosted checkout, implemented from https://safepay-docs.netlify.app and
// Safepay's official Node SDK (@sfpy/node-core). Calls the REST API directly.
//
// VERIFY IN SANDBOX before going live (the docs leave these open):
//  - AMOUNT_MULTIPLIER: docs say amounts are in the "lowest denomination" (paisa).
//  - Field paths read in trackerState() and parseWebhook().

const AMOUNT_MULTIPLIER = 100;

const HOSTS = {
  sandbox: { api: "https://sandbox.api.getsafepay.com", checkout: "https://sandbox.api.getsafepay.com/embedded/" },
  production: { api: "https://api.getsafepay.com", checkout: "https://getsafepay.com/embedded/" },
} as const;

type Env = keyof typeof HOSTS;

function config() {
  const env = (process.env.SAFEPAY_ENV === "production" ? "production" : "sandbox") as Env;
  const apiKey = process.env.SAFEPAY_API_KEY;
  const secret = process.env.SAFEPAY_SECRET_KEY;
  if (!apiKey || !secret) throw new PaymentGatewayError("Safepay keys are not configured.");
  return { env, apiKey, secret, host: HOSTS[env] };
}

export const safepayConfigured = () => Boolean(process.env.SAFEPAY_API_KEY && process.env.SAFEPAY_SECRET_KEY);

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const { host, secret } = config();
  const res = await fetch(`${host.api}${path}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", "x-sfpy-merchant-secret": secret },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.status?.errors?.[0] ?? json?.status?.message ?? res.statusText;
    throw new PaymentGatewayError(`Safepay ${method} ${path} failed (${res.status}): ${message}`);
  }
  return json as T;
}

/** Tracker states that mean the money was taken (later refunds don't undo the sale). */
const PAID_STATES = new Set(["TRACKER_ENDED", "TRACKER_REFUNDED", "TRACKER_PARTIAL_REFUND"]);
const FAILED_STATES = new Set(["TRACKER_FAILED", "TRACKER_CANCELLED", "TRACKER_EXPIRED"]);

function trackerState(json: { data?: { tracker?: { state?: string }; state?: string } }) {
  return json.data?.tracker?.state ?? json.data?.state ?? "UNKNOWN";
}

export const safepay: PaymentProvider = {
  id: "safepay",
  label: "Debit or credit card (Safepay)",

  async createCheckout({ orderId, orderNumber, amount, returnUrl, cancelUrl }) {
    const { env, apiKey, host } = config();
    const session = await call<{ data: { tracker: { token: string } } }>("POST", "/order/payments/v3/", {
      merchant_api_key: apiKey,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: amount * AMOUNT_MULTIPLIER,
      metadata: { order_id: orderId, order_number: String(orderNumber) },
    });
    const tracker = session.data.tracker.token;
    // Short-lived (1 hour) token that lets the hosted page load this tracker.
    const { data: tbt } = await call<{ data: string }>("POST", "/client/passport/v1/token");

    const params = new URLSearchParams({
      environment: env,
      tracker,
      tbt,
      source: "hosted",
      redirect_url: returnUrl,
      cancel_url: cancelUrl,
    });
    return { ref: tracker, redirectUrl: `${host.checkout}?${params}`, raw: session };
  },

  async fetchState(ref): Promise<PaymentState> {
    const state = trackerState(await call("GET", `/reporter/api/v1/payments/${encodeURIComponent(ref)}`));
    if (PAID_STATES.has(state)) return "paid";
    if (FAILED_STATES.has(state)) return "failed";
    return "pending";
  },

  parseWebhook(rawBody, headers): GatewayEvent | null {
    const secrets = [process.env.SAFEPAY_WEBHOOK_SECRET, process.env.SAFEPAY_WEBHOOK_SECRET_PREVIOUS];
    if (!verifySignature(rawBody, headers.get("x-sfpy-signature"), secrets)) return null;

    const event = JSON.parse(rawBody) as {
      type?: string;
      data?: { tracker?: string; amount?: number; currency?: string };
    };
    const ref = event.data?.tracker;
    if (event.type === "payment.succeeded" && ref) {
      return {
        kind: "paid",
        ref,
        amount: Math.round((event.data?.amount ?? 0) / AMOUNT_MULTIPLIER),
        currency: event.data?.currency ?? "",
        raw: event,
      };
    }
    if (event.type === "payment.failed" && ref) return { kind: "failed", ref, raw: event };
    // Safepay adds new event types over time; acknowledge and ignore the rest.
    return { kind: "ignored", type: event.type ?? "unknown" };
  },

  async refund(ref, amount) {
    const json = await call<{ data?: { action?: { token?: string }; tracker?: { state?: string } } }>(
      "POST",
      `/order/payments/v3/${encodeURIComponent(ref)}/refund`,
      { currency: "PKR", amount: amount * AMOUNT_MULTIPLIER },
    );
    return { refundRef: json.data?.action?.token ?? `${ref}:refund` };
  },
};
