import { revalidateTag } from "next/cache";
import { acknowledgeUpdates } from "@/lib/crm-orders";
import { updatesAckSchema } from "@/lib/crm-stock";
import { readSignedCrmJson } from "@/lib/crm-sync";

/** The ERP reporting which updates it applied (COLLECTED, REVERSED, RETURNED). */
export async function POST(request: Request) {
  const input = await readSignedCrmJson(request, updatesAckSchema);
  if (input instanceof Response) return input;

  const result = await acknowledgeUpdates(input.source, input.data.results);
  if (result.recorded > 0) revalidateTag("offers", "max");
  return Response.json(result);
}
