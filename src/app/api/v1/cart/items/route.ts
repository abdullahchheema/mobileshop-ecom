import { z } from "zod";
import { handleDomainError, readJson, requireApiUser } from "@/lib/api";
import { addToCart, getCart } from "@/lib/cart";

const body = z.object({ offerId: z.string().min(1), quantity: z.number().int().min(1).max(5).default(1) });

/** Adds an offer to the cart (quantity is added to what's already there). */
export async function POST(request: Request) {
  const userId = await requireApiUser(request);
  if (userId instanceof Response) return userId;
  const input = await readJson(request, body);
  if (input instanceof Response) return input;

  try {
    await addToCart({ userId }, input.offerId, input.quantity);
  } catch (e) {
    return handleDomainError(e);
  }
  return Response.json({ data: await getCart({ userId }) }, { status: 201 });
}
