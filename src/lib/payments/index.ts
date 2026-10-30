import "server-only";
import { safepay, safepayConfigured } from "@/lib/payments/safepay";
import { testGateway, testGatewayEnabled } from "@/lib/payments/test-gateway";
import type { PaymentProvider } from "@/lib/payments/types";

/** The gateway new online payments use, or null if online payment isn't set up. */
export function getCheckoutProvider(): PaymentProvider | null {
  const choice = process.env.PAYMENT_PROVIDER;
  if (choice === "safepay") return safepayConfigured() ? safepay : null;
  if (choice === "test") return testGatewayEnabled() ? testGateway : null;
  return null;
}

/** The gateway that handled an existing payment (for webhooks, status checks and refunds). */
export function providerById(id: string | null | undefined): PaymentProvider | null {
  if (id === "safepay") return safepay;
  if (id === "test") return testGatewayEnabled() ? testGateway : null;
  return null;
}
