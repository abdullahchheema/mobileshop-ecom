import { revalidateTag } from "next/cache";
import { z } from "zod";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, findShipment, notFound } from "@/lib/erp-api";
import { COURIERS } from "@/lib/fulfillment";
import { applyFulfillment } from "@/lib/seller-orders";

const body = z.discriminatedUnion("action", [
  z.object({ sellerOrderId: z.string().min(1), action: z.enum(["confirm", "deliver", "cancel"]) }),
  z.object({
    sellerOrderId: z.string().min(1),
    action: z.literal("ship"),
    courier: z.enum(COURIERS),
    trackingNumber: z.string().trim().min(4, "Enter the tracking number").max(40),
  }),
]);

/**
 * Moves one shipment forward: confirm → ship (courier + tracking) → deliver, or cancel it.
 * The same function the website admin used, so SMS, stock add-back and card refunds behave identically.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/orders/[id]/fulfil">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  const { id } = await params;

  const shipment = await findShipment(input.source, id, input.data.sellerOrderId);
  if (!shipment) return notFound("That shipment");

  try {
    await applyFulfillment(shipment.sellerId, shipment.id, input.data.action, input.data.action === "ship" ? input.data : undefined);
  } catch (e) {
    return erpError(e);
  }
  // A cancelled shipment puts the phone back on sale.
  if (input.data.action === "cancel") revalidateTag("offers", "max");
  return Response.json({ ok: true });
}
