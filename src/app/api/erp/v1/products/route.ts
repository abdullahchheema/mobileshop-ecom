import { listAdminProducts } from "@/lib/admin-products";
import { requireCrmSource } from "@/lib/crm-sync";

/** Website products for the ERP's product screen. `?q=iphone&page=1`. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const { products, total, pageCount } = await listAdminProducts({ q: url.searchParams.get("q")?.trim() || undefined, page });
  return Response.json({
    total,
    pageCount,
    page,
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      category: p.category.name,
      isActive: p.isActive,
      releaseYear: p.releaseYear,
      photos: p.images.length,
      firstPhoto: p.images[0] ?? null,
      onSale: p._count.offers,
    })),
  });
}
