import { NextResponse, type NextRequest } from "next/server";
import { localized } from "@/i18n/server";
import { db } from "@/lib/db";
import { syncPaymentState } from "@/lib/payments/service";

/**
 * Where the gateway sends the buyer back. The browser redirect proves nothing,
 * so we ask the gateway for the real status before showing "paid". The cancel
 * link lands here too (?cancelled=1) so both end on the buyer's language.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/payment/return/[orderId]">) {
  const { orderId } = await params;
  const ref = request.nextUrl.searchParams.get("tracker");
  const cancelled = request.nextUrl.searchParams.has("cancelled");
  const orderPath = await localized(`/account/orders/${orderId}`);
  const back = (query: string) => NextResponse.redirect(new URL(`${orderPath}?${query}`, request.url));

  const payment = ref
    ? await db.payment.findFirst({ where: { orderId, providerRef: ref }, select: { provider: true, providerRef: true } })
    : null;
  if (!payment?.provider || !payment.providerRef) return back(cancelled ? "payment=cancelled" : "payment=pending");

  try {
    const state = await syncPaymentState(payment.provider, payment.providerRef);
    if (state === "paid") return back("placed=1");
    return back(cancelled && state === "pending" ? "payment=cancelled" : `payment=${state}`);
  } catch (e) {
    // Gateway unreachable: the webhook will still confirm the payment.
    console.error("[payments] status check on return failed", e);
    return back("payment=pending");
  }
}
