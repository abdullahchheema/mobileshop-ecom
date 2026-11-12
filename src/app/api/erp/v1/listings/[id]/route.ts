import { getListingForMapping } from "@/lib/crm-mapping";
import { requireCrmSource } from "@/lib/crm-sync";
import { notFound, ownsListing } from "@/lib/erp-api";

/** One ERP stock group and the variant it points at (as chosen option value ids), for the map form. */
export async function GET(request: Request, { params }: RouteContext<"/api/erp/v1/listings/[id]">) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  const { id } = await params;
  if (!(await ownsListing(source, id))) return notFound("That ERP group");

  const listing = await getListingForMapping(id);
  if (!listing) return notFound("That ERP group");
  return Response.json({
    listing: {
      ...listing,
      productId: listing.variant?.productId ?? null,
      valueIds: listing.variant?.optionValues.map((v) => v.id) ?? [],
      variant: undefined,
    },
  });
}
