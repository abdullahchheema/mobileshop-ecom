import "server-only";
import { createHash } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { BANNERS, type Banner } from "@/lib/banners";
import * as map from "@/lib/erp-mapping";
import type { Catalogue } from "@/lib/erp-types";
import { type ListingFilters, PAGE_SIZE } from "@/lib/listing-params";
import { ErpConfigError, getSupabase } from "@/lib/supabase";

// The storefront owns no data: every product, price and stock number comes from the ERP's public views (schema `api`).
// The whole catalogue is read once and cached for about a minute (the guide asks for 30 s or so; the built-in "minutes"
// profile is the shortest that still lets Next prerender around it). A stale page can never
// oversell, because the ERP's order API re-checks stock and price when the order is placed.

export type { Facets, NavCategory, ProductCardData, ProductPageData } from "@/lib/erp-mapping";

const PAGE = 1000; // PostgREST returns at most this many rows per request

async function readAll<T>(table: string, order: string[]): Promise<T[]> {
  const sb = getSupabase();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    // An explicit order is what makes paging safe: without it Postgres may repeat or skip rows between pages.
    let query = sb.from(table).select("*");
    for (const column of order) query = query.order(column, { ascending: true });
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function getCatalogue(): Promise<Catalogue> {
  "use cache";
  cacheTag("catalogue"); // the ERP (and a placed order) drop this tag so changes show at once; the minute below is only the safety net
  cacheLife("minutes"); // refreshed about every minute; shorter profiles make Next treat the whole page as dynamic

  try {
    // Per-shop stock (web_variant_stock) is deliberately NOT read: the storefront never learns which shop holds a phone.
    const [families, listings, variants, images] = await Promise.all([
      readAll<Catalogue["families"][number]>("web_families", ["family_slug"]),
      readAll<Catalogue["listings"][number]>("web_listings", ["product_id"]),
      readAll<Catalogue["variants"][number]>("web_variants", ["product_id", "condition", "pta_status", "device_type", "price"]),
      readAll<Catalogue["images"][number]>("web_images", ["image_id"]),
    ]);
    return { families, listings, variants, images, stock: [] };
  } catch (e) {
    if (e instanceof ErpConfigError) throw e;
    // The ERP is unreachable: log it here and show a friendly notice (see CatalogueNotice), not an error page.
    console.error("[catalog] could not read the ERP catalogue", e);
    return { families: [], listings: [], variants: [], images: [], stock: [], unavailable: true };
  }
}

const index = async () => map.indexCatalogue(await getCatalogue());

/** A short fingerprint of what the storefront shows (stock, prices, pages, photos). Pages poll it and refresh themselves when it changes. */
export async function getCatalogueVersion() {
  const c = await getCatalogue();
  const parts = [
    ...c.families.map((f) => `${f.family_slug}:${f.stock_total}:${f.price_from}:${f.cover_url ?? ""}`),
    ...c.variants.map((v) => `${v.product_id}:${v.condition}:${v.pta_status}:${v.device_type}:${v.price}:${v.quantity}`),
    ...c.images.map((i) => `${i.image_id}:${i.position}`),
  ];
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

/** Categories (taken from the ERP's own category names) for the header nav, menus and footer. */
export async function getNavCategories() {
  return map.navCategories(await index());
}

export async function getBanners(placement: Banner["placement"]) {
  return BANNERS.filter((b) => b.placement === placement).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategory(slug: string) {
  return map.categoryInfo(await index(), slug);
}

export async function getListing(filters: ListingFilters, pageSize = PAGE_SIZE) {
  return map.listing(await index(), filters, pageSize);
}

export async function getFacets(categorySlug?: string) {
  return map.facets(await index(), categorySlug);
}

export async function getProductPage(slug: string) {
  return map.productPage(await index(), slug);
}

/** Small product lists for carousels (home page, "similar products"). */
export async function getProductRail(options: {
  category?: string;
  sort: ListingFilters["sort"];
  limit: number;
  excludeSlug?: string;
}) {
  const { items } = map.listing(
    await index(),
    { category: options.category, brands: [], storages: [], conditions: [], years: [], ptaOnly: false, sort: options.sort, page: 1 },
    options.limit + 1,
  );
  return items.filter((p) => p.slug !== options.excludeSlug).slice(0, options.limit);
}

/** Top matches for the search box dropdown. */
export async function getSearchSuggestions(q: string) {
  const { items } = map.listing(
    await index(),
    { q, brands: [], storages: [], conditions: [], years: [], ptaOnly: false, sort: "popular", page: 1 },
    6,
  );
  return items.map(({ slug, name, brand, kind, fromPrice }) => ({ slug, name, brand, kind, fromPrice }));
}

/** True when the last read of the ERP failed, so pages can say so instead of looking empty. */
export async function isCatalogueUnavailable() {
  return Boolean((await getCatalogue()).unavailable);
}

export async function getBrands() {
  return map.brandList(await index());
}

/**
 * Current price and stock for cart lines, straight from the ERP's variants (the cart never trusts what the browser
 * remembers). Keyed by `variantKey`. A variant missing from the result is sold out or no longer sold.
 */
export async function getVariantsByKey(keys: string[]) {
  const wanted = new Set(keys);
  const { cat } = await index();
  const out = new Map<string, { price: number; quantity: number; warrantyMonths: number; productId: string; condition: string | null; pta: string | null; type: string | null; name: string; slug: string; image: string | null; label: string; kind: string }>();
  const listingById = new Map(cat.listings.map((l) => [String(l.product_id), l]));
  const familyBySlug = new Map(cat.families.map((f) => [f.family_slug, f]));
  for (const v of cat.variants) {
    const key = map.variantKey(v);
    if (!wanted.has(key)) continue;
    const listing = listingById.get(String(v.product_id));
    const family = listing && familyBySlug.get(listing.family_slug);
    if (!listing || !family) continue;
    const label = [listing.storage, listing.colour, v.condition, v.pta_status].filter((x) => x && String(x).trim()).join(" · ");
    out.set(key, {
      price: map.num(v.price),
      quantity: map.num(v.quantity),
      warrantyMonths: map.warrantyMonths(v.warranty_days),
      productId: String(v.product_id),
      condition: v.condition,
      pta: v.pta_status,
      type: v.device_type,
      name: family.title,
      slug: family.family_slug,
      image: listing.cover_url ?? family.cover_url ?? null,
      label,
      kind: map.kindOf(family.category, family.is_phone),
    });
  }
  return out;
}
