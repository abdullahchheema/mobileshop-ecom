import { revalidateTag } from "next/cache";
import { snapshotSchema } from "@/lib/crm-stock";
import { applySnapshot, readSignedCrmJson } from "@/lib/crm-sync";

/**
 * Receives a stock snapshot from Covison ERP (the ERP calls us; see docs/crm-integration.md).
 * Authenticates with `Authorization: Bearer crm_…`, plus HMAC headers when configured on the source.
 */
export async function POST(request: Request) {
  const input = await readSignedCrmJson(request, snapshotSchema);
  if (input instanceof Response) return input;

  const result = await applySnapshot(input.source, input.data.items, input.data.full);
  if (result.offersUpdated > 0 || result.soldOut > 0) revalidateTag("offers", "max");
  return Response.json(result);
}
