import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/api";
import { requireCrmSource } from "@/lib/crm-sync";
import { ErpStockError, refreshFromErp } from "@/lib/erp-stock";

/**
 * The ERP calls this right after it commits a change to its phones (a sale, purchase, return,
 * inspection or price change). We re-read its `online_stock` view and update the listings.
 * Same auth as the other ERP routes: `Authorization: Bearer crm_…` plus the HMAC headers.
 */
export async function POST(request: Request) {
  const source = await requireCrmSource(request, await request.text());
  if (source instanceof Response) return source;

  try {
    const result = await refreshFromErp(source);
    if (result.offersUpdated > 0 || result.soldOut > 0) revalidateTag("offers", "max");
    return Response.json(result);
  } catch (e) {
    if (e instanceof ErpStockError) return apiError(503, "ERP_UNAVAILABLE", e.message);
    throw e;
  }
}
