import { revalidateTag } from "next/cache";
import { handleDomainError, readJson, requireApiUser } from "@/lib/api";
import { getOrder, getOrders, placeOrder } from "@/lib/orders";
import { startOnlinePayment } from "@/lib/payments/service";
import { placeOrderSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  return Response.json({ data: await getOrders(userId) });
}

/** Places an order from the user's cart. Send the total the user confirmed as `expectedTotal`. */
export async function POST(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const input = await readJson(request, placeOrderSchema);
  if (input instanceof Response) return input;

  let orderId: string;
  try {
    orderId = (await placeOrder({ userId, ...input })).id;
  } catch (e) {
    return handleDomainError(e);
  }
  revalidateTag("offers", "max");

  // Card orders: the app opens paymentUrl in a browser/WebView to pay.
  let paymentUrl: string | null = null;
  if (input.paymentMethod !== "COD") {
    paymentUrl = await startOnlinePayment(userId, orderId).catch((e) => {
      console.error("[api] could not start payment", e);
      return null;
    });
  }
  return Response.json({ data: await getOrder(userId, orderId), paymentUrl }, { status: 201 });
}
