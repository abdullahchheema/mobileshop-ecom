import "server-only";
import { db } from "@/lib/db";

export class VariantError extends Error {}

/**
 * Finds the variant for one value per product option, creating it when nobody
 * has used that combination yet. Shared by seller listings and the ERP mapping screen.
 */
export async function ensureVariant(productId: string, valueIds: string[]) {
  const product = await db.product.findUnique({
    where: { id: productId },
    select: { slug: true, options: { select: { id: true, values: { select: { id: true } } } } },
  });
  if (!product) throw new VariantError("Product not found.");

  const chosen = product.options.map((o) => o.values.find((v) => valueIds.includes(v.id))?.id);
  if (chosen.some((id) => !id) || valueIds.length !== product.options.length) {
    throw new VariantError("Choose one value for every option.");
  }
  const ids = chosen as string[];
  const combinationKey = [...ids].sort().join("|");

  return (
    (await db.variant.findUnique({
      where: { productId_combinationKey: { productId, combinationKey } },
      select: { id: true },
    })) ??
    (await db.variant.create({
      data: {
        productId,
        combinationKey,
        sku: `${product.slug}-${crypto.randomUUID().slice(0, 8)}`,
        optionValues: { connect: ids.map((id) => ({ id })) },
      },
      select: { id: true },
    }))
  );
}
