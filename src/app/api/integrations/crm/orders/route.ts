import { listOrdersForErp } from "@/lib/crm-orders";
import { requireCrmSource } from "@/lib/crm-sync";

/**
 * Orders the ERP still has to book (oldest first, at most 50). The ERP asks again until it
 * acknowledges each one at /orders/ack, so repeated calls return the same orders.
 */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  return Response.json({ orders: await listOrdersForErp(source) });
}
