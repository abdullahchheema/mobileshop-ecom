// URL <-> filter state for category, search and deals pages.
// Lists are comma separated so URLs stay short: ?brand=apple,samsung&storage=128-gb

export const SORTS = [
  { key: "popular", label: "Most popular" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "savings", label: "Biggest savings" },
  { key: "newest", label: "Newest models" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];

export type ListingFilters = {
  category?: string;
  q?: string;
  brands: string[];
  storages: string[];
  conditions: string[];
  years: number[];
  ptaOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort: SortKey;
  page: number;
};

export const PAGE_SIZE = 24;

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const positiveInt = (v: string | string[] | undefined) => {
  const n = Number.parseInt(first(v) ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseListingParams(params: RawParams, defaults: Partial<ListingFilters> = {}): ListingFilters {
  const sort = first(params.sort);
  return {
    category: defaults.category,
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    brands: list(params.brand),
    storages: list(params.storage),
    conditions: list(params.condition),
    years: list(params.year).map(Number).filter(Number.isInteger),
    ptaOnly: first(params.pta) === "1",
    minPrice: positiveInt(params.min),
    maxPrice: positiveInt(params.max),
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : (defaults.sort ?? "popular"),
    page: positiveInt(params.page) ?? 1,
  };
}

/** Builds a URL for the same listing with some params changed. Resets to page 1 unless `page` is set. */
export function listingHref(pathname: string, current: RawParams, changes: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    const v = first(value);
    if (v && key !== "page") params.set(key, v);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Product-page query for a card on a filtered listing, so the product opens on
 * the configuration the card priced (e.g. ?condition=excellent&storage=256-gb).
 * Keys match the product page's picker keys (slugified option names).
 */
export function productQuery(filters: ListingFilters) {
  const params = new URLSearchParams();
  if (filters.conditions.length === 1) params.set("condition", filters.conditions[0]);
  if (filters.storages.length === 1) params.set("storage", filters.storages[0]);
  if (filters.ptaOnly) params.set("pta-status", "pta-approved");
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Adds or removes one value from a comma-separated list param. */
export function toggleListValue(current: string | string[] | undefined, value: string) {
  const values = list(current);
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return next.length ? next.join(",") : null;
}
