import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { type ListingFilters, PAGE_SIZE } from "@/lib/listing-params";
import type { Picker, PickerType, VariantSummary } from "@/lib/pricing";
import { savingsPercent } from "@/lib/pricing";
import { slugify } from "@/lib/slug";

// Cache tags: "categories", "banners", "offers" (any price/stock change), `product:<slug>`.

/** An offer a buyer can actually purchase right now. */
const buyableOffer = {
  status: "ACTIVE",
  stock: { gt: 0 },
  seller: { status: "APPROVED" },
} satisfies Prisma.OfferWhereInput;

/** Top-level categories (with their children) for the header nav, menus and footer. */
export async function getNavCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  return db.category.findMany({
    where: { parentId: null, isFeatured: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      children: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } },
    },
  });
}

export type NavCategory = Awaited<ReturnType<typeof getNavCategories>>[number];

export async function getBanners(placement: "HOME_HERO" | "HOME_PROMO") {
  "use cache";
  cacheLife("hours");
  cacheTag("banners");

  return db.banner.findMany({
    where: { placement, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getCategory(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  return db.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      parent: { select: { name: true, slug: true, icon: true } },
      children: { orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } },
    },
  });
}

/** A category plus all of its descendants (the tree is two levels deep). */
async function categoryIds(slug: string) {
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, children: { select: { id: true } } },
  });
  return category ? [category.id, ...category.children.map((c) => c.id)] : [];
}

function productWhere(filters: Pick<ListingFilters, "brands" | "years" | "q">, ids: string[] | null) {
  const tokens = filters.q?.split(/\s+/).filter(Boolean) ?? [];
  return {
    isActive: true,
    ...(ids && { categoryId: { in: ids } }),
    ...(filters.brands.length && { brand: { slug: { in: filters.brands } } }),
    ...(filters.years.length && { releaseYear: { in: filters.years } }),
    // Every word must match the product name, brand or category ("galaxy 256" style queries).
    AND: tokens.map((t) => ({
      OR: [
        { name: { contains: t, mode: "insensitive" } },
        { brand: { name: { contains: t, mode: "insensitive" } } },
        { category: { name: { contains: t, mode: "insensitive" } } },
      ],
    })),
  } satisfies Prisma.ProductWhereInput;
}

function variantWhere(filters: Pick<ListingFilters, "storages" | "conditions" | "ptaOnly">) {
  const clauses: Prisma.VariantWhereInput[] = [];
  const has = (type: PickerType, values: string[]) =>
    clauses.push({ optionValues: { some: { value: { in: values }, option: { type } } } });
  if (filters.conditions.length) has("CONDITION", filters.conditions);
  if (filters.storages.length) has("STORAGE", filters.storages);
  if (filters.ptaOnly) has("SIM", ["pta-approved"]);
  return clauses.length ? { AND: clauses } : undefined;
}

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  images: true,
  newPrice: true,
  releaseYear: true,
  brand: { select: { name: true } },
  category: { select: { icon: true, parent: { select: { icon: true } } } },
  options: {
    where: { type: "COLOR" },
    select: { values: { orderBy: { position: "asc" }, select: { label: true, colorHex: true } } },
  },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  kind: string;
  /** Main photo, if an admin uploaded one. */
  image: string | null;
  releaseYear: number | null;
  colors: { label: string; hex: string }[];
  fromPrice: number;
  newPrice: number | null;
  savings: number;
  offerCount: number;
};

function toCard(p: CardRow, fromPrice: number, offerCount: number): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand.name,
    kind: p.category.parent?.icon ?? p.category.icon ?? "smartphone",
    image: p.images[0] ?? null,
    releaseYear: p.releaseYear,
    colors: p.options.flatMap((o) => o.values.map((v) => ({ label: v.label, hex: v.colorHex ?? "#cccccc" }))),
    fromPrice,
    newPrice: p.newPrice,
    savings: savingsPercent(fromPrice, p.newPrice),
    offerCount,
  };
}

/**
 * Products for a category, search or deals page. Each product's "from" price is
 * its cheapest buyable offer that also matches the variant filters (condition,
 * storage, PTA), so filtering by "Excellent" shows Excellent prices.
 */
export async function getListing(filters: ListingFilters, pageSize = PAGE_SIZE) {
  "use cache";
  cacheLife("minutes");
  cacheTag("offers");

  const ids = filters.category ? await categoryIds(filters.category) : null;
  if (ids?.length === 0) return { items: [], total: 0, page: 1, pageCount: 0 };

  const groups = await db.offer.groupBy({
    by: ["productId"],
    where: { ...buyableOffer, product: productWhere(filters, ids), variant: variantWhere(filters) },
    _min: { price: true },
    _count: { _all: true },
  });

  const inRange = groups.filter((g) => {
    const price = g._min.price ?? 0;
    return (!filters.minPrice || price >= filters.minPrice) && (!filters.maxPrice || price <= filters.maxPrice);
  });

  const products = await db.product.findMany({
    where: { id: { in: inRange.map((g) => g.productId) } },
    select: cardSelect,
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const cards = inRange.flatMap((g) => {
    const p = byId.get(g.productId);
    return p ? [toCard(p, g._min.price ?? 0, g._count._all)] : [];
  });

  const sorters: Record<ListingFilters["sort"], (a: ProductCardData, b: ProductCardData) => number> = {
    popular: (a, b) => b.offerCount - a.offerCount || a.fromPrice - b.fromPrice,
    "price-asc": (a, b) => a.fromPrice - b.fromPrice,
    "price-desc": (a, b) => b.fromPrice - a.fromPrice,
    savings: (a, b) => b.savings - a.savings || a.fromPrice - b.fromPrice,
    newest: (a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0) || b.fromPrice - a.fromPrice,
  };
  cards.sort(sorters[filters.sort]);

  const pageCount = Math.ceil(cards.length / pageSize);
  const page = Math.min(Math.max(filters.page, 1), Math.max(pageCount, 1));
  return {
    items: cards.slice((page - 1) * pageSize, page * pageSize),
    total: cards.length,
    page,
    pageCount,
  };
}

export type Facets = {
  brands: { label: string; value: string }[];
  storages: { label: string; value: string }[];
  conditions: { label: string; value: string }[];
  years: number[];
  hasPta: boolean;
};

/** Filter choices that actually exist in a category (or the whole catalog). */
export async function getFacets(categorySlug?: string): Promise<Facets> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "offers");

  const ids = categorySlug ? await categoryIds(categorySlug) : null;
  const products = await db.product.findMany({
    where: { isActive: true, ...(ids && { categoryId: { in: ids } }) },
    select: {
      releaseYear: true,
      brand: { select: { name: true, slug: true } },
      options: {
        where: { type: { in: ["CONDITION", "STORAGE", "SIM"] } },
        select: { type: true, values: { select: { label: true, value: true, position: true } } },
      },
    },
  });

  const uniq = <T,>(items: T[], key: (t: T) => string) => [...new Map(items.map((i) => [key(i), i])).values()];
  const values = (type: PickerType) =>
    products.flatMap((p) => p.options.filter((o) => o.type === type).flatMap((o) => o.values));
  const gigabytes = (label: string) => Number.parseFloat(label) * (label.includes("TB") ? 1024 : 1);

  return {
    brands: uniq(products.map((p) => ({ label: p.brand.name, value: p.brand.slug })), (b) => b.value).sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
    storages: uniq(values("STORAGE"), (v) => v.value)
      .sort((a, b) => gigabytes(a.label) - gigabytes(b.label))
      .map(({ label, value }) => ({ label, value })),
    conditions: uniq(values("CONDITION"), (v) => v.value)
      .sort((a, b) => a.position - b.position)
      .map(({ label, value }) => ({ label, value })),
    years: [...new Set(products.map((p) => p.releaseYear).filter((y): y is number => y !== null))].sort((a, b) => b - a),
    hasPta: values("SIM").length > 0,
  };
}

/** Everything the product page needs: catalog data plus every variant's buyable offers. */
export async function getProductPage(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("offers", `product:${slug}`);

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      specs: true,
      images: true,
      newPrice: true,
      releaseYear: true,
      brand: { select: { name: true, slug: true } },
      category: {
        select: { name: true, slug: true, icon: true, parent: { select: { name: true, slug: true, icon: true } } },
      },
      options: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          type: true,
          name: true,
          values: { orderBy: { position: "asc" }, select: { id: true, label: true, value: true, colorHex: true } },
        },
      },
      variants: {
        select: {
          id: true,
          optionValues: { select: { id: true } },
          offers: {
            where: buyableOffer,
            orderBy: { price: "asc" },
            select: {
              id: true,
              price: true,
              stock: true,
              warrantyMonths: true,
              seller: { select: { shopName: true, slug: true, city: true } },
            },
          },
        },
      },
    },
  });
  if (!product) return null;

  const pickers: Picker[] = product.options.map((o) => ({ ...o, key: slugify(o.name) }));
  const variants: VariantSummary[] = product.variants.map((v) => ({
    id: v.id,
    valueIds: v.optionValues.map((ov) => ov.id),
    offers: v.offers.map(({ seller, ...offer }) => ({
      ...offer,
      seller: { name: seller.shopName, slug: seller.slug, city: seller.city },
    })),
  }));

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    newPrice: product.newPrice,
    releaseYear: product.releaseYear,
    brand: product.brand,
    category: product.category,
    specs: (product.specs ?? {}) as Record<string, string>,
    images: product.images,
    kind: product.category.parent?.icon ?? product.category.icon ?? "smartphone",
    pickers,
    variants,
  };
}

export type ProductPageData = NonNullable<Awaited<ReturnType<typeof getProductPage>>>;

/** Small product lists for carousels (home page, "similar products"). */
export async function getProductRail(options: {
  category?: string;
  sort: ListingFilters["sort"];
  limit: number;
  excludeSlug?: string;
}) {
  "use cache";
  cacheLife("minutes");
  cacheTag("offers");

  const { items } = await getListing(
    {
      category: options.category,
      brands: [],
      storages: [],
      conditions: [],
      years: [],
      ptaOnly: false,
      sort: options.sort,
      page: 1,
    },
    options.limit + 1,
  );
  return items.filter((p) => p.slug !== options.excludeSlug).slice(0, options.limit);
}

/** Top matches for the search box dropdown. */
export async function getSearchSuggestions(q: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("offers");

  const { items } = await getListing(
    { q, brands: [], storages: [], conditions: [], years: [], ptaOnly: false, sort: "popular", page: 1 },
    6,
  );
  return items.map(({ slug, name, brand, kind, fromPrice }) => ({ slug, name, brand, kind, fromPrice }));
}

export async function getBrands() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");

  return db.brand.findMany({
    where: { products: { some: { isActive: true } } },
    orderBy: { name: "asc" },
    select: { name: true, slug: true },
  });
}
