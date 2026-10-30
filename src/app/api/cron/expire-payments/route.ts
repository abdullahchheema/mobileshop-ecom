import { revalidateTag } from "next/cache";
import { cancelOrder } from "@/lib/orders";
import { expireUnpaidOrders } from "@/lib/payments/service";

/**
 * Cancels card orders left unpaid past their payment window and puts the stock
 * back on sale. Run every few minutes (see vercel.json). Requires CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  const result = await expireUnpaidOrders((orderId) => cancelOrder(null, orderId));
  if (result.expired > 0) revalidateTag("offers", "max");
  return Response.json(result);
}
