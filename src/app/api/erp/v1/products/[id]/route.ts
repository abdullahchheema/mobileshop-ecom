import { z } from "zod";
import { getAdminProduct, updateProduct } from "@/lib/admin-products";
import { readSignedCrmJson, requireCrmSource } from "@/lib/crm-sync";
import { erpError, expireProduct, notFound } from "@/lib/erp-api";
import { apiError } from "@/lib/api";

export async function GET(request: Request, { params }: RouteContext<"/api/erp/v1/products/[id]">) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;
  const product = await getAdminProduct((await params).id);
  if (!product) return notFound("That product");
  return Response.json({
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      releaseYear: product.releaseYear,
      newPrice: product.newPrice,
      description: product.description,
      isActive: product.isActive,
      images: product.images,
      specs: product.specs ?? {},
    },
  });
}

const body = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  brandId: z.string().min(1, "Choose a brand"),
  categoryId: z.string().min(1, "Choose a category"),
  releaseYear: z.number().int().min(2000).max(2100).nullish(),
  newPrice: z.number().int().min(0).max(10_000_000).nullish(),
  description: z.string().trim().max(2000).nullish(),
  isActive: z.boolean(),
});

/** Edits a product's basics (name, brand, category, year, new price, description, on/off). The link (slug) never changes. */
export async function POST(request: Request, { params }: RouteContext<"/api/erp/v1/products/[id]">) {
  const input = await readSignedCrmJson(request, body);
  if (input instanceof Response) return input;
  const { id } = await params;
  try {
    const { slug } = await updateProduct(id, {
      ...input.data,
      releaseYear: input.data.releaseYear ?? undefined,
      newPrice: input.data.newPrice ?? undefined,
      description: input.data.description || null,
    });
    expireProduct(slug);
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2025") return notFound("That product");
    if (typeof e === "object" && e && "code" in e && e.code === "P2003") return apiError(409, "REJECTED", "That brand or category no longer exists.");
    return erpError(e);
  }
  return Response.json({ ok: true });
}
