import { revalidateTag } from "next/cache";
import { z } from "zod";
import { unmapListing } from "@/lib/crm-mapping";
import { readSignedCrmJson } from "@/lib/crm-sync";
import { erpError, notFound, ownsListing } from "@/lib/erp-api";

/** Stops listing an ERP stock group. Its website listing sells out. */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/listings/[id]/unmap">) {
  const input = await readSignedCrmJson(request, z.object({}).nullable());
  if (input instanceof Response) return input;
  const { id } = await params;
  if (!(await ownsListing(input.source, id))) return notFound("That ERP group");

  try {
    await unmapListing(id);
  } catch (e) {
    return erpError(e);
  }
  revalidateTag("offers", "max");
  return Response.json({ ok: true });
}
