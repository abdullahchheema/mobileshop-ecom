import { getMappingProducts } from "@/lib/crm-mapping";
import { requireCrmSource } from "@/lib/crm-sync";

/** Website products with their options and values, so the ERP can link a stock group to the right variant. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  return Response.json({ products: await getMappingProducts() });
}
