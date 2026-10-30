"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { OptionType } from "@/generated/prisma/client";
import type { ActionResult } from "@/components/console/action-form";
import { ADMINS_ONLY, isAdmin } from "@/lib/admin";
import {
  addOption,
  addOptionValue,
  CatalogError,
  createProduct,
  makeImageFirst,
  OPTION_TYPES,
  productSchema,
  removeImage,
  removeOption,
  removeOptionValue,
  setSpecs,
  updateProduct,
} from "@/lib/admin-products";
import { BANNER_THEMES } from "@/components/home/banner-theme";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

// Catalog edits change the storefront: expire its caches immediately.
function expireCatalog(...extra: string[]) {
  updateTag("categories");
  updateTag("offers");
  for (const tag of extra) updateTag(tag);
  refresh();
}

const fail = (error: string): ActionResult => ({ ok: false, error });
const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form.";

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  let slug = slugify(base) || "item";
  for (let n = 2; await taken(slug); n++) slug = `${slugify(base)}-${n}`;
  return slug;
}

// ─── Categories ─────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(60),
  parentId: z.string().optional().transform((v) => v || null),
  icon: z.string().optional().transform((v) => v || null),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isFeatured: z.literal("on").optional().transform(Boolean),
});

export async function createCategoryAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = categorySchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const slug = await uniqueSlug(parsed.data.name, async (s) => Boolean(await db.category.findUnique({ where: { slug: s } })));
  await db.category.create({ data: { ...parsed.data, slug } });
  expireCatalog();
  return { ok: true, message: `Added ${parsed.data.name}` };
}

export async function updateCategoryAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = categorySchema.omit({ parentId: true }).extend({ id: z.string().min(1) }).safeParse(Object.fromEntries(data));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const { id, ...fields } = parsed.data;
  await db.category.update({ where: { id }, data: fields });
  expireCatalog();
  return { ok: true, message: "Category saved" };
}

export async function deleteCategoryAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const id = z.string().min(1).parse(data.get("id"));
  const category = await db.category.findUnique({
    where: { id },
    select: { name: true, _count: { select: { products: true, children: true } } },
  });
  if (!category) return fail("Category not found.");
  const { products, children } = category._count;
  if (products || children) {
    const parts = [products && `${products} products`, children && `${children} subcategories`].filter(Boolean);
    return fail(`${category.name} still has ${parts.join(" and ")}. Move or delete them first.`);
  }
  await db.category.delete({ where: { id } });
  expireCatalog();
  return { ok: true, message: `Deleted ${category.name}` };
}

// ─── Brands ─────────────────────────────────────────────────────────────────

const brandSchema = z.object({ name: z.string().trim().min(2, "Name is too short").max(40) });

export async function createBrandAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = brandSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (await db.brand.findUnique({ where: { name: parsed.data.name } })) return fail("That brand already exists.");

  const slug = await uniqueSlug(parsed.data.name, async (s) => Boolean(await db.brand.findUnique({ where: { slug: s } })));
  await db.brand.create({ data: { name: parsed.data.name, slug } });
  expireCatalog();
  return { ok: true, message: `Added ${parsed.data.name}` };
}

export async function deleteBrandAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const id = z.string().min(1).parse(data.get("id"));
  const brand = await db.brand.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!brand) return fail("Brand not found.");
  if (brand._count.products) return fail(`${brand.name} still has ${brand._count.products} products.`);
  await db.brand.delete({ where: { id } });
  expireCatalog();
  return { ok: true, message: `Deleted ${brand.name}` };
}

// ─── Products ───────────────────────────────────────────────────────────────

async function catalogAction(run: () => Promise<{ slug: string }>, message: string): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  try {
    const { slug } = await run();
    expireCatalog(`product:${slug}`);
    return { ok: true, message };
  } catch (e) {
    if (e instanceof CatalogError || e instanceof z.ZodError) return fail(e instanceof z.ZodError ? firstIssue(e) : e.message);
    throw e;
  }
}

export async function createProductAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = productSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const product = await createProduct(parsed.data);
  expireCatalog();
  redirect(`/admin/products/${product.id}?created=1`);
}

export async function updateProductAction(data: FormData) {
  return catalogAction(
    () => updateProduct(z.string().parse(data.get("id")), productSchema.parse(Object.fromEntries(data))),
    "Product saved",
  );
}

const specsSchema = z
  .array(z.object({ key: z.string().trim().min(1).max(40), value: z.string().trim().min(1).max(120) }))
  .max(30);

export async function saveSpecsAction(productId: string, rows: { key: string; value: string }[]) {
  return catalogAction(() => {
    const specs = Object.fromEntries(specsSchema.parse(rows.filter((r) => r.key.trim() && r.value.trim())).map((r) => [r.key, r.value]));
    return setSpecs(productId, specs);
  }, "Specifications saved");
}

export async function removeImageAction(data: FormData) {
  return catalogAction(() => removeImage(z.string().parse(data.get("id")), z.string().parse(data.get("url"))), "Image removed");
}

export async function makeImageFirstAction(data: FormData) {
  return catalogAction(() => makeImageFirst(z.string().parse(data.get("id")), z.string().parse(data.get("url"))), "Main image updated");
}

const optionSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(OPTION_TYPES.map((t) => t.value) as [OptionType, ...OptionType[]]),
  name: z.string().trim().min(2, "Name the option, e.g. Storage").max(30),
});

export async function addOptionAction(data: FormData) {
  return catalogAction(() => {
    const { productId, ...input } = optionSchema.parse(Object.fromEntries(data));
    return addOption(productId, input);
  }, "Option added");
}

export async function removeOptionAction(data: FormData) {
  return catalogAction(() => removeOption(z.string().parse(data.get("optionId"))), "Option removed");
}

const valueSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().trim().min(1, "Enter a value").max(40),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function addOptionValueAction(data: FormData) {
  return catalogAction(() => {
    const { optionId, ...input } = valueSchema.parse(Object.fromEntries(data));
    return addOptionValue(optionId, input);
  }, "Value added");
}

export async function removeOptionValueAction(data: FormData) {
  return catalogAction(() => removeOptionValue(z.string().parse(data.get("valueId"))), "Value removed");
}

// ─── Home banners ───────────────────────────────────────────────────────────

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

const bannerSchema = z.object({
  placement: z.enum(["HOME_HERO", "HOME_PROMO"]),
  title: z.string().trim().min(3, "Add a title").max(80),
  subtitle: optionalText(160),
  ctaLabel: optionalText(30),
  titleUr: optionalText(80),
  subtitleUr: optionalText(160),
  ctaLabelUr: optionalText(30),
  // Internal paths or https only: never javascript: or other schemes.
  ctaHref: optionalText(300).refine((v) => !v || /^\/(?!\/)/.test(v) || /^https:\/\//.test(v), {
    message: "Links must start with / (a page on this site) or https://",
  }),
  theme: z.enum(BANNER_THEMES),
  sortOrder: z.coerce.number().int().min(0).max(99).default(0),
  isActive: z.literal("on").optional().transform(Boolean),
});

export async function saveBannerAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = bannerSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const id = data.get("id");

  if (typeof id === "string" && id) await db.banner.update({ where: { id }, data: parsed.data });
  else await db.banner.create({ data: parsed.data });
  updateTag("banners");
  refresh();
  return { ok: true, message: "Banner saved" };
}

export async function deleteBannerAction(data: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return ADMINS_ONLY;
  await db.banner.delete({ where: { id: z.string().min(1).parse(data.get("id")) } });
  updateTag("banners");
  refresh();
  return { ok: true, message: "Banner deleted" };
}
