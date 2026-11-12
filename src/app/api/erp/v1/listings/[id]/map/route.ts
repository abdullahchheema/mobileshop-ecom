import { revalidateTag } from "next/cache";
import { z } from "zod";
import { mapListing } from "@/lib/crm-mapping";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, notFound, ownsListing } from "@/lib/erp-api";

const body = z.object({
  productId: z.string().min(1, "Choose a product"),
  /** One chosen option value id per product option (condition, storage, PTA, colour…). */
  valueIds: z.array(z.string().min(1)).max(10),
});

/** Links an ERP stock group to a website product variant (created if needed) and lists it. */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/listings/[id]/map">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  const { id } = await params;
  if (!(await ownsListing(input.source, id))) return notFound("That ERP group");

  try {
    await mapListing(id, input.data.productId, input.data.valueIds);
  } catch (e) {
    return erpError(e);
  }
  revalidateTag("offers", "max");
  return Response.json({ ok: true });
}
