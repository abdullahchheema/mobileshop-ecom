// What every online payment gateway must provide. Amounts are whole rupees here;
// each provider converts to its own units.

export type PaymentState = "paid" | "pending" | "failed";

export type CheckoutSession = { ref: string; redirectUrl: string; raw?: unknown };

/** A verified, gateway-agnostic webhook event. Unknown event types come back as "ignored". */
export type GatewayEvent =
  | { kind: "paid"; ref: string; amount: number; currency: string; raw: unknown }
  | { kind: "failed"; ref: string; raw: unknown }
  | { kind: "ignored"; type: string };

export interface PaymentProvider {
  id: "safepay" | "test";
  /** Shown to buyers at checkout. */
  label: string;
  createCheckout(input: {
    orderId: string;
    orderNumber: number;
    amount: number;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutSession>;
  /** Asks the gateway directly. Never trust the browser's redirect alone. */
  fetchState(ref: string): Promise<PaymentState>;
  /** Returns null when the signature doesn't check out. */
  parseWebhook(rawBody: string, headers: Headers): GatewayEvent | null;
  refund(ref: string, amount: number): Promise<{ refundRef: string }>;
}

export class PaymentGatewayError extends Error {}
