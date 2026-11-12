import "server-only";
import { cacheLife } from "next/cache";
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

async function readAll<T>(table: string): Promise<T[]> {
  const sb = getSupabase();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

async function getCatalogue(): Promise<Catalogue> {
  "use cache";
  cacheLife("minutes"); // refreshed about every minute; shorter profiles make Next treat the whole page as dynamic

  try {
    const [families, listings, variants, images] = await Promise.all([
      readAll<Catalogue["families"][number]>("web_families"),
      readAll<Catalogue["listings"][number]>("web_listings"),
      readAll<Catalogue["variants"][number]>("web_variants"),
      readAll<Catalogue["images"][number]>("web_images"),
    ]);
    return { families, listings, variants, images };
  } catch (e) {
    if (e instanceof ErpConfigError) throw e;
    // The ERP is unreachable: show an empty store for a moment rather than an error page.
    console.error("[catalog] could not read the ERP catalogue", e);
    return { families: [], listings: [], variants: [], images: [] };
  }
}

const index = async () => map.indexCatalogue(await getCatalogue());

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
