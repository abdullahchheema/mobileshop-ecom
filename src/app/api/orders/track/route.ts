import { z } from "zod";
import { getErpOrder } from "@/lib/erp-orders";
import { apiError } from "@/lib/http";
import { refMatchesPhone } from "@/lib/order-ref";
import { clientIp, tooMany } from "@/lib/rate-limit";

const body = z.object({ ref: z.string().trim().min(8).max(60), phone: z.string().trim().min(10).max(20) });

/** Order tracking: needs the order number and the phone it was placed with. The ERP key never leaves the server. */
export async function POST(request: Request) {
  if (tooMany(`track:${clientIp(request)}`, 20, 10 * 60_000)) return apiError(429, "RATE_LIMITED", "Too many attempts. Please wait a few minutes.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID", "Enter your order number and the mobile number you ordered with.");
  const { ref, phone } = parsed.data;
  // The same answer for a wrong number and an unknown order, so nothing can be probed.
  if (!refMatchesPhone(ref, phone)) return apiError(404, "NOT_FOUND", "We couldn't find an order with that number and mobile number.");
  try {
    const order = await getErpOrder(ref.toUpperCase());
    if (!order) return apiError(404, "NOT_FOUND", "We couldn't find an order with that number and mobile number.");
    return Response.json({ order });
  } catch (e) {
    console.error("[track] could not load the order from the ERP", e);
    return apiError(503, "UNAVAILABLE", "We couldn't load your order right now. Please try again shortly.");
  }
}
