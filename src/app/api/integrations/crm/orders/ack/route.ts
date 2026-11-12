import { revalidateTag } from "next/cache";
import { acknowledgeOrders } from "@/lib/crm-orders";
import { ackSchema } from "@/lib/crm-stock";
import { readSignedCrmJson } from "@/lib/crm-sync";

/** The ERP's answer for orders it fetched: BOOKED (with its document codes) or FAILED (with a reason). */
export async function POST(request: Request) {
  const input = await readSignedCrmJson(request, ackSchema);
  if (input instanceof Response) return input;

  const result = await acknowledgeOrders(input.source, input.data.results);
  if (result.recorded > 0) revalidateTag("offers", "max");
  return Response.json(result);
}
