import { listUpdatesForErp } from "@/lib/crm-orders";
import { requireCrmSource } from "@/lib/crm-sync";

/** What happened to orders the ERP already booked: delivered (cash on delivery), cancelled, or a refunded return. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  return Response.json(await listUpdatesForErp(source));
}
