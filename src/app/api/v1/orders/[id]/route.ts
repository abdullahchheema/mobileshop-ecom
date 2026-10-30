import { apiError, requireApiUser } from "@/lib/api";
import { getOrder } from "@/lib/orders";

export async function GET(request: Request, { params }: RouteContext<"/api/v1/orders/[id]">) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const order = await getOrder(userId, (await params).id);
  return order ? Response.json({ data: order }) : apiError(404, "NOT_FOUND", "Order not found.");
}
