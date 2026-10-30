import { revalidateTag } from "next/cache";
import { handleDomainError, requireApiUser } from "@/lib/api";
import { cancelOrder, getOrder } from "@/lib/orders";

export async function POST(request: Request, { params }: RouteContext<"/api/v1/orders/[id]/cancel">) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const { id } = await params;
  try {
    await cancelOrder(userId, id);
  } catch (e) {
    return handleDomainError(e);
  }
  revalidateTag("offers", "max");
  return Response.json({ data: await getOrder(userId, id) });
}
