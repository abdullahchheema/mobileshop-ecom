import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { hmacSha512Hex, verifySignature } from "@/lib/payments/signature";
import { type GatewayEvent, PaymentGatewayError, type PaymentProvider } from "@/lib/payments/types";
import { site } from "@/lib/site";

// A fake gateway for local development, so the whole online-payment flow (hosted
// page → signed webhook → return redirect → server-side check) runs without a
// merchant account. Disabled in production.

export const testGatewayEnabled = () => process.env.NODE_ENV !== "production" && Boolean(process.env.TEST_GATEWAY_SECRET);

export type TestSession = { state: "pending" | "paid" | "failed"; amount: number; returnUrl: string; cancelUrl: string };

function secret() {
  if (!testGatewayEnabled()) throw new PaymentGatewayError("The test gateway is only available in development.");
  return process.env.TEST_GATEWAY_SECRET!;
}

// The test session lives inside Payment.raw (alongside any recorded events).
export async function getTestSession(ref: string) {
  const payment = await db.payment.findFirst({
    where: { provider: "test", providerRef: ref },
    select: { raw: true, order: { select: { number: true } } },
  });
  if (!payment) return null;
  const { state, amount, returnUrl, cancelUrl } = payment.raw as TestSession;
  return { state, amount, returnUrl, cancelUrl, orderNumber: payment.order.number };
}

/** Simulates the gateway: records the outcome, then calls our webhook the way Safepay would. */
export async function completeTestPayment(ref: string, outcome: "paid" | "failed") {
  const session = await getTestSession(ref);
  if (!session) throw new PaymentGatewayError("Unknown test payment.");
  const payment = await db.payment.findFirstOrThrow({ where: { provider: "test", providerRef: ref }, select: { id: true, raw: true } });
  await db.payment.update({
    where: { id: payment.id },
    data: { raw: { ...(payment.raw as TestSession), state: outcome } },
  });

  const body = JSON.stringify({
    type: outcome === "paid" ? "payment.succeeded" : "payment.failed",
    data: { tracker: ref, amount: session.amount, currency: "PKR" },
  });
  await fetch(`${site.url}/api/webhooks/payments/test`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-signature": hmacSha512Hex(secret(), body) },
    body,
  }).catch((e) => console.error("[test-gateway] webhook delivery failed", e));

  // Like Safepay: back to the return URL with ?tracker=…, where our server checks
  // the outcome (paid or declined). Only "Cancel" uses the cancel URL.
  return `${session.returnUrl}?tracker=${encodeURIComponent(ref)}`;
}

export const testGateway: PaymentProvider = {
  id: "test",
  label: "Card (test gateway, development only)",

  async createCheckout({ amount, returnUrl, cancelUrl }) {
    secret();
    const ref = `test_${randomUUID()}`;
    const session: TestSession = { state: "pending", amount, returnUrl, cancelUrl };
    // Only the ref travels in the URL; amounts and return URLs stay server-side.
    return { ref, redirectUrl: `${site.url}/dev/payment-gateway?ref=${ref}`, raw: session };
  },

  async fetchState(ref) {
    const session = await getTestSession(ref);
    return session?.state ?? "failed";
  },

  parseWebhook(rawBody, headers): GatewayEvent | null {
    if (!verifySignature(rawBody, headers.get("x-test-signature"), [secret()])) return null;
    const event = JSON.parse(rawBody) as { type: string; data: { tracker: string; amount: number; currency: string } };
    if (event.type === "payment.succeeded") {
      return { kind: "paid", ref: event.data.tracker, amount: event.data.amount, currency: event.data.currency, raw: event };
    }
    if (event.type === "payment.failed") return { kind: "failed", ref: event.data.tracker, raw: event };
    return { kind: "ignored", type: event.type };
  },

  async refund() {
    secret();
    return { refundRef: `test_refund_${randomUUID().slice(0, 8)}` };
  },
};
