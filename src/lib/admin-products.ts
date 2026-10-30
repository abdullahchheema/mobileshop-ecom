import "server-only";
import { z } from "zod";
import type { OptionType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { deleteProductImage } from "@/lib/storage";

export class CatalogError extends Error {}

export const OPTION_TYPES: { value: OptionType; label: string }[] = [
  { value: "STORAGE", label: "Storage" },
  { value: "COLOR", label: "Color" },
  { value: "SIM", label: "PTA / SIM" },
  { value: "BATTERY", label: "Battery" },
  { value: "RAM", label: "RAM" },
  { value: "PROCESSOR", label: "Processor" },
  { value: "OTHER", label: "Other (case size, edition…)" },
];

/** Every product starts with the standard condition grades used across the site. */
const DEFAULT_CONDITIONS = ["Fair", "Good", "Excellent", "Premium"];

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  brandId: z.string().min(1, "Choose a brand"),
  categoryId: z.string().min(1, "Choose a category"),
  releaseYear: z.coerce.number().int().min(2000).max(2100).optional().or(z.literal("").transform(() => undefined)),
  newPrice: z.coerce.number().int().min(0).max(10_000_000).optional().or(z.literal("").transform(() => undefined)),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  isActive: z.literal("on").optional().transform(Boolean),
});

export async function listAdminProducts(opts: { q?: string; page: number }) {
  const pageSize = 30;
  const tokens = opts.q?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.ProductWhereInput = {
    AND: tokens.map((t) => ({ name: { contains: t, mode: "insensitive" } })),
  };
  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (opts.page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        name: true,
        images: true,
        isActive: true,
        releaseYear: true,
        brand: { select: { name: true } },
        category: { select: { name: true, icon: true, parent: { select: { icon: true } } } },
        _count: { select: { offers: { where: { status: "ACTIVE", stock: { gt: 0 } } } } },
      },
    }),
  ]);
  return { products, total, pageCount: Math.ceil(total / pageSize) };
}

export async function getAdminProduct(id: string) {
  const product = await db.product.findUnique({
    where: { id },
    include: {
      brand: true,
      category: { include: { parent: true } },
      options: {
        orderBy: { position: "asc" },
        include: {
          values: {
            orderBy: { position: "asc" },
            include: { _count: { select: { variants: { where: { offers: { some: {} } } } } } },
          },
        },
      },
      _count: { select: { variants: true, offers: true } },
    },
  });
  return product;
}

async function uniqueProductSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  for (let n = 2; ; n++) {
    const taken = await db.product.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === excludeId) return slug;
    slug = `${base}-${n}`;
  }
}

export async function createProduct(input: z.infer<typeof productSchema>) {
  const slug = await uniqueProductSlug(input.name);
  return db.product.create({
    data: {
      ...input,
      slug,
      images: [],
      specs: {},
      options: {
        create: {
          type: "CONDITION",
          name: "Condition",
          position: 0,
          values: { create: DEFAULT_CONDITIONS.map((label, position) => ({ label, value: slugify(label), position })) },
        },
      },
    },
    select: { id: true, slug: true },
  });
}

/** Updates basics. The slug stays fixed so shared links and listings keep working. */
export function updateProduct(id: string, input: z.infer<typeof productSchema>) {
  return db.product.update({ where: { id }, data: input, select: { slug: true } });
}

export function setSpecs(id: string, specs: Record<string, string>) {
  return db.product.update({ where: { id }, data: { specs }, select: { slug: true } });
}

export async function addImages(id: string, urls: string[]) {
  const product = await db.product.findUniqueOrThrow({ where: { id }, select: { images: true } });
  return db.product.update({ where: { id }, data: { images: [...product.images, ...urls] }, select: { slug: true, images: true } });
}

export async function removeImage(id: string, url: string) {
  const product = await db.product.findUniqueOrThrow({ where: { id }, select: { images: true } });
  const updated = await db.product.update({
    where: { id },
    data: { images: product.images.filter((u) => u !== url) },
    select: { slug: true },
  });
  await deleteProductImage(url);
  return updated;
}

/** Moves an image to the front: the first image is the one shown on cards. */
export async function makeImageFirst(id: string, url: string) {
  const product = await db.product.findUniqueOrThrow({ where: { id }, select: { images: true } });
  if (!product.images.includes(url)) throw new CatalogError("Image not found.");
  return db.product.update({
    where: { id },
    data: { images: [url, ...product.images.filter((u) => u !== url)] },
    select: { slug: true },
  });
}

/** New pickers can only be added before anything is listed: existing variants would lack a value for them. */
export async function addOption(productId: string, input: { type: OptionType; name: string }) {
  const product = await db.product.findUniqueOrThrow({
    where: { id: productId },
    select: { slug: true, _count: { select: { variants: true } }, options: { select: { name: true, position: true } } },
  });
  if (product._count.variants > 0) {
    throw new CatalogError("This product already has listings, so its options can't change. Create a new product instead.");
  }
  if (product.options.some((o) => o.name.toLowerCase() === input.name.toLowerCase())) {
    throw new CatalogError(`There's already a "${input.name}" option.`);
  }
  const position = Math.max(-1, ...product.options.map((o) => o.position)) + 1;
  await db.productOption.create({ data: { productId, ...input, position } });
  return product;
}

export async function removeOption(optionId: string) {
  const option = await db.productOption.findUniqueOrThrow({
    where: { id: optionId },
    select: { type: true, product: { select: { slug: true, _count: { select: { variants: true } } } } },
  });
  if (option.type === "CONDITION") throw new CatalogError("Every product needs a Condition option.");
  if (option.product._count.variants > 0) throw new CatalogError("This product already has listings, so its options can't change.");
  await db.productOption.delete({ where: { id: optionId } });
  return option.product;
}

export async function addOptionValue(optionId: string, input: { label: string; colorHex?: string }) {
  const option = await db.productOption.findUniqueOrThrow({
    where: { id: optionId },
    select: { type: true, product: { select: { slug: true } }, values: { select: { value: true, position: true } } },
  });
  const value = slugify(input.label);
  if (!value) throw new CatalogError("Enter a name for the value.");
  if (option.values.some((v) => v.value === value)) throw new CatalogError(`"${input.label}" already exists.`);
  if (option.type === "COLOR" && !input.colorHex) throw new CatalogError("Pick a swatch color.");

  await db.optionValue.create({
    data: {
      optionId,
      label: input.label,
      value,
      colorHex: option.type === "COLOR" ? input.colorHex : null,
      position: Math.max(-1, ...option.values.map((v) => v.position)) + 1,
    },
  });
  return option.product;
}

/** Removes a value nobody sells. Variants that used it (with no offers) go too. */
export async function removeOptionValue(valueId: string) {
  const value = await db.optionValue.findUniqueOrThrow({
    where: { id: valueId },
    select: {
      label: true,
      option: { select: { product: { select: { slug: true } }, _count: { select: { values: true } } } },
      variants: { select: { id: true, _count: { select: { offers: true } } } },
    },
  });
  if (value.variants.some((v) => v._count.offers > 0)) {
    throw new CatalogError(`Sellers have listings with "${value.label}". Ask them to remove those first.`);
  }
  if (value.option._count.values <= 1) throw new CatalogError("An option needs at least one value. Remove the option instead.");

  await db.$transaction([
    db.variant.deleteMany({ where: { id: { in: value.variants.map((v) => v.id) } } }),
    db.optionValue.delete({ where: { id: valueId } }),
  ]);
  return value.option.product;
}

/** Brands and the category tree, for product forms. */
export async function getCatalogOptions() {
  const [brands, categories] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
    }),
  ]);
  return { brands, categories };
}
