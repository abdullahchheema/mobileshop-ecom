import { z } from "zod";
import { handleDomainError, readJson, requireApiUser } from "@/lib/api";
import { getCart, removeFromCart, setQuantity } from "@/lib/cart";

const body = z.object({ quantity: z.number().int().min(0).max(5) });

export async function PATCH(request: Request, { params }: RouteContext<"/api/v1/cart/items/[id]">) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const input = await readJson(request, body);
  if (input instanceof Response) return input;

  try {
    await setQuantity({ userId }, (await params).id, input.quantity);
  } catch (e) {
    return handleDomainError(e);
  }
  return Response.json({ data: await getCart({ userId }) });
}

export async function DELETE(request: Request, { params }: RouteContext<"/api/v1/cart/items/[id]">) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  await removeFromCart({ userId }, (await params).id);
  return Response.json({ data: await getCart({ userId }) });
}
