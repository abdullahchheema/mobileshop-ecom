import { requireApiUser } from "@/lib/api";
import { getCart } from "@/lib/cart";

export async function GET(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  return Response.json({ data: await getCart({ userId }) });
}
