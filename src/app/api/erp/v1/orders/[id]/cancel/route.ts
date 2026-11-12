import { revalidateTag } from "next/cache";
import { z } from "zod";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, notFound, ownsOrder } from "@/lib/erp-api";
import { cancelOrder } from "@/lib/orders";

/** Cancels the whole order: refunds a card payment first, returns the phones to stock and texts the buyer. */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/orders/[id]/cancel">) {
  const input = await readSignedCrmJson(request, z.object({}).nullable());
  if (input instanceof Response) return input;
  const { id } = await params;
  if (!(await ownsOrder(input.source, id))) return notFound("That order");

  try {
    await cancelOrder(null, id);
  } catch (e) {
    return erpError(e);
  }
  revalidateTag("offers", "max");
  return Response.json({ ok: true });
}
