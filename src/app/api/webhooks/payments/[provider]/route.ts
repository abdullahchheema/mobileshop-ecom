import { revalidateTag } from "next/cache";
import { handlePaymentWebhook } from "@/lib/payments/service";

/** Payment gateway webhooks (Safepay: /api/webhooks/payments/safepay). Signature-checked. */
export async function POST(request: Request, { params }: RouteContext<"/api/webhooks/payments/[provider]">) {
  const { provider } = await params;
  // The signature covers the exact bytes sent, so read the raw body before parsing.
  const rawBody = await request.text();
  const status = await handlePaymentWebhook(provider, rawBody, request.headers);
  if (status === 200) revalidateTag("offers", "max");
  return new Response(null, { status });
}
