import { requireCrmSource } from "@/lib/crm-sync";
import { getCrmOverview, MAPPING_FILTERS } from "@/lib/crm-mapping";

/** ERP stock groups and what each is linked to on the website. `?filter=unmapped|mapped|all`. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const wanted = new URL(request.url).searchParams.get("filter");
  const filter = MAPPING_FILTERS.find((f) => f.key === wanted)?.key ?? "unmapped";
  const overview = await getCrmOverview(filter);
  return Response.json({ filter, filters: MAPPING_FILTERS, ...overview, sources: overview.sources.filter((s) => s.id === source.id) });
}
