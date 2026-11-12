import { requireCrmSource } from "@/lib/crm-sync";
import { db } from "@/lib/db";

/** Brands and categories for the ERP's product form. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  const [brands, categories] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({ orderBy: [{ name: "asc" }], select: { id: true, name: true, parent: { select: { name: true } } } }),
  ]);
  return Response.json({
    brands,
    categories: categories.map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} › ${c.name}` : c.name })),
  });
}
