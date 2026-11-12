// Turns the ERP's catalogue rows into the shapes the storefront screens use. Pure functions (no network, no cache),
// so they are easy to test: see erp-mapping.test.ts. The fetching and caching live in catalog.ts.
import type { ListingFilters } from "@/lib/listing-params";
import type { Picker, PickerType, VariantSummary } from "@/lib/pricing";
import { savingsPercent } from "@/lib/pricing";
import { site } from "@/lib/site";
import { slugify } from "@/lib/slug";
import type { Catalogue, FamilyRow, ImageRow, ListingRow, VariantRow } from "@/lib/erp-types";

export const num = (v: number | string | null | undefined) => {
  const n = typeof v === "number" ? v : v === null || v === undefined || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const text = (v: string | null | undefined) => (v ?? "").trim();

/** Identity of a sellable variant. Also the cart line id and the cart's key to the ERP. */
export const variantKey = (v: Pick<VariantRow, "product_id" | "condition" | "pta_status" | "device_type">) =>
  [v.product_id, text(v.condition), text(v.pta_status), text(v.device_type)].join("|");

/** "PTA", "PTA Approved" count as PTA approved; "Non-PTA", "Not PTA" do not. */
export const isPtaApproved = (pta: string | null | undefined) => /^pta\b/i.test(text(pta)) && !/non|not/i.test(text(pta));

const COLOUR_HEX: Record<string, string> = {
  black: "#1f2023", white: "#f5f5f7", silver: "#d9dbdf", gray: "#8e9196", grey: "#8e9196", space: "#4a4c52", graphite: "#4b4d52",
  gold: "#e3c9a8", rose: "#e7b8b0", pink: "#f3b9cf", red: "#c8262f", blue: "#2f6fb4", sierra: "#9bb6d3", pacific: "#2c5d77",
  green: "#4f7a59", midnight: "#1f2630", starlight: "#f0e6d6", purple: "#8d77b3", violet: "#8d77b3", yellow: "#f0d65a",
  orange: "#e98b3c", coral: "#ee7b6c", titanium: "#a6a7a8", natural: "#c9c2b6", cream: "#efe7d6", lavender: "#c9b8de",
};

export function colourHex(label: string) {
  const word = label.toLowerCase().split(/[^a-z]+/).find((w) => COLOUR_HEX[w]);
  return word ? COLOUR_HEX[word] : "#cccccc";
}

/** Icon names the UI understands (see category-icon.tsx / device-art.tsx). */
export function kindOf(category: string | null | undefined, isPhone: boolean) {
  const c = text(category).toLowerCase();
  if (isPhone || /phone|mobile/.test(c)) return "smartphone";
  if (/laptop|notebook|mac/.test(c)) return "laptop";
  if (/tablet|ipad/.test(c)) return "tablet";
  if (/watch|wearable/.test(c)) return "watch";
  if (/audio|head|ear|speaker|airpod/.test(c)) return "headphones";
  if (/game|gaming|console/.test(c)) return "gamepad";
  return "smartphone";
}

export const warrantyMonths = (days: number | string | null | undefined) => {
  const d = num(days);
  return d > 0 ? Math.max(1, Math.round(d / 30)) : site.warrantyMonths;
};

const gigabytes = (label: string) => Number.parseFloat(label) * (/tb/i.test(label) ? 1024 : 1) || 0;

// ─── Types the screens use (same names and shapes as before the ERP) ────────────────────────────────────────

export type NavCategory = { id: string; name: string; slug: string; icon: string; children: { id: string; name: string; slug: string }[] };

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  kind: string;
  image: string | null;
  releaseYear: number | null;
  colors: { label: string; hex: string }[];
  fromPrice: number;
  newPrice: number | null;
  savings: number;
  offerCount: number;
};

export type Facets = {
  brands: { label: string; value: string }[];
  storages: { label: string; value: string }[];
  conditions: { label: string; value: string }[];
  years: number[];
  hasPta: boolean;
};

// ─── Indexes ────────────────────────────────────────────────────────────────────────────────────────────────

type Index = {
  cat: Catalogue;
  listingById: Map<string, ListingRow>;
  variantsByFamily: Map<string, { variant: VariantRow; listing: ListingRow }[]>;
  listingsByFamily: Map<string, ListingRow[]>;
};

export function indexCatalogue(cat: Catalogue): Index {
  const listingById = new Map(cat.listings.map((l) => [String(l.product_id), l]));
  const listingsByFamily = new Map<string, ListingRow[]>();
  for (const l of cat.listings) listingsByFamily.set(l.family_slug, [...(listingsByFamily.get(l.family_slug) ?? []), l]);
  const variantsByFamily = new Map<string, { variant: VariantRow; listing: ListingRow }[]>();
  for (const variant of cat.variants) {
    const listing = listingById.get(String(variant.product_id));
    if (!listing || num(variant.quantity) <= 0) continue;
    variantsByFamily.set(listing.family_slug, [...(variantsByFamily.get(listing.family_slug) ?? []), { variant, listing }]);
  }
  return { cat, listingById, variantsByFamily, listingsByFamily };
}

const categorySlug = (f: FamilyRow) => slugify(text(f.category));

// ─── Navigation, categories, brands ─────────────────────────────────────────────────────────────────────────

export function navCategories(ix: Index): NavCategory[] {
  const seen = new Map<string, NavCategory>();
  for (const f of ix.cat.families) {
    const name = text(f.category);
    if (!name) continue;
    const slug = slugify(name);
    if (!seen.has(slug)) seen.set(slug, { id: slug, name, slug, icon: kindOf(name, f.is_phone), children: [] });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function categoryInfo(ix: Index, slug: string) {
  const c = navCategories(ix).find((n) => n.slug === slug);
  return c ? { id: c.id, name: c.name, slug: c.slug, description: null, icon: c.icon, parent: null, children: [] } : null;
}

export function brandList(ix: Index) {
  const map = new Map<string, string>();
  for (const f of ix.cat.families) if (text(f.brand) && ix.variantsByFamily.has(f.family_slug)) map.set(slugify(text(f.brand)), text(f.brand));
  return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Listing ────────────────────────────────────────────────────────────────────────────────────────────────

function cardFor(ix: Index, f: FamilyRow, rows: { variant: VariantRow; listing: ListingRow }[]): ProductCardData {
  const cheapest = rows.reduce((best, r) => (num(r.variant.price) < num(best.variant.price) ? r : best), rows[0]);
  const price = num(cheapest.variant.price);
  const compare = num(cheapest.variant.compare_price);
  const newPrice = compare > price ? compare : null;
  const colours = [...new Set((ix.listingsByFamily.get(f.family_slug) ?? []).map((l) => text(l.colour)).filter(Boolean))];
  return {
    id: f.family_slug,
    slug: f.family_slug,
    name: f.title,
    brand: text(f.brand),
    kind: kindOf(f.category, f.is_phone),
    image: f.cover_url ?? null,
    releaseYear: null,
    colors: colours.map((label) => ({ label, hex: colourHex(label) })),
    fromPrice: price,
    newPrice,
    savings: newPrice ? savingsPercent(price, newPrice) : 0,
    offerCount: rows.length,
  };
}

function matches(filters: Pick<ListingFilters, "storages" | "conditions" | "ptaOnly">, r: { variant: VariantRow; listing: ListingRow }) {
  if (filters.storages.length && !filters.storages.includes(slugify(text(r.listing.storage)))) return false;
  if (filters.conditions.length && !filters.conditions.includes(slugify(text(r.variant.condition)))) return false;
  if (filters.ptaOnly && !isPtaApproved(r.variant.pta_status)) return false;
  return true;
}

export function listing(ix: Index, filters: ListingFilters, pageSize: number) {
  const tokens = filters.q?.toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const cards: ProductCardData[] = [];
  for (const f of ix.cat.families) {
    if (filters.category && categorySlug(f) !== filters.category) continue;
    if (filters.brands.length && !filters.brands.includes(slugify(text(f.brand)))) continue;
    const haystack = `${f.title} ${text(f.brand)} ${text(f.category)}`.toLowerCase();
    if (tokens.some((t) => !haystack.includes(t))) continue;
    const rows = (ix.variantsByFamily.get(f.family_slug) ?? []).filter((r) => matches(filters, r));
    if (rows.length === 0) continue; // sold out (or no match for the chosen filters): not shown in lists
    const card = cardFor(ix, f, rows);
    if (filters.minPrice && card.fromPrice < filters.minPrice) continue;
    if (filters.maxPrice && card.fromPrice > filters.maxPrice) continue;
    cards.push(card);
  }
  const sorters: Record<ListingFilters["sort"], (a: ProductCardData, b: ProductCardData) => number> = {
    popular: (a, b) => b.offerCount - a.offerCount || a.fromPrice - b.fromPrice,
    "price-asc": (a, b) => a.fromPrice - b.fromPrice,
    "price-desc": (a, b) => b.fromPrice - a.fromPrice,
    savings: (a, b) => b.savings - a.savings || a.fromPrice - b.fromPrice,
    newest: (a, b) => a.name.localeCompare(b.name),
  };
  cards.sort(sorters[filters.sort]);
  const pageCount = Math.ceil(cards.length / pageSize);
  const page = Math.min(Math.max(filters.page, 1), Math.max(pageCount, 1));
  return { items: cards.slice((page - 1) * pageSize, page * pageSize), total: cards.length, page, pageCount };
}

export function facets(ix: Index, category?: string): Facets {
  const families = ix.cat.families.filter((f) => !category || categorySlug(f) === category);
  const rows = families.flatMap((f) => ix.variantsByFamily.get(f.family_slug) ?? []);
  const uniq = <T,>(items: T[], key: (t: T) => string) => [...new Map(items.map((i) => [key(i), i])).values()];
  return {
    brands: uniq(
      families.filter((f) => text(f.brand) && ix.variantsByFamily.has(f.family_slug)).map((f) => ({ label: text(f.brand), value: slugify(text(f.brand)) })),
      (b) => b.value,
    ).sort((a, b) => a.label.localeCompare(b.label)),
    storages: uniq(
      rows.filter((r) => text(r.listing.storage)).map((r) => ({ label: text(r.listing.storage), value: slugify(text(r.listing.storage)) })),
      (s) => s.value,
    ).sort((a, b) => gigabytes(a.label) - gigabytes(b.label)),
    conditions: uniq(
      rows.filter((r) => text(r.variant.condition)).map((r) => ({ label: text(r.variant.condition), value: slugify(text(r.variant.condition)) })),
      (c) => c.value,
    ),
    years: [],
    hasPta: rows.some((r) => text(r.variant.pta_status) !== ""),
  };
}

// ─── Product (model) page ───────────────────────────────────────────────────────────────────────────────────

const pickerKey = (name: string) => slugify(name);

export function productPage(ix: Index, slug: string) {
  const family = ix.cat.families.find((f) => f.family_slug === slug);
  if (!family) return null;
  const rows = (ix.variantsByFamily.get(slug) ?? []).sort((a, b) => num(a.variant.price) - num(b.variant.price));
  const listings = ix.listingsByFamily.get(slug) ?? [];

  // One picker per choice the buyer actually has (two or more values). Ids are prefixed so they never collide.
  type Def = { type: PickerType; name: string; prefix: string; labelOf: (r: { variant: VariantRow; listing: ListingRow }) => string };
  const defs: Def[] = [
    { type: "STORAGE", name: "Storage", prefix: "storage", labelOf: (r) => text(r.listing.storage) },
    { type: "COLOR", name: "Color", prefix: "color", labelOf: (r) => text(r.listing.colour) },
    { type: "CONDITION", name: "Condition", prefix: "condition", labelOf: (r) => text(r.variant.condition) },
    { type: "SIM", name: "PTA status", prefix: "pta", labelOf: (r) => text(r.variant.pta_status) },
    { type: "OTHER", name: "Type", prefix: "type", labelOf: (r) => text(r.variant.device_type) },
  ];
  const pickers: Picker[] = [];
  const idsFor = (r: { variant: VariantRow; listing: ListingRow }) =>
    defs.flatMap((d) => {
      const label = d.labelOf(r);
      return label ? [`${d.prefix}:${slugify(label)}`] : [];
    });
  for (const d of defs) {
    const labels = [...new Map(rows.filter((r) => d.labelOf(r)).map((r) => [slugify(d.labelOf(r)), d.labelOf(r)])).entries()];
    if (labels.length < 2) continue;
    if (d.type === "STORAGE") labels.sort((a, b) => gigabytes(a[1]) - gigabytes(b[1]));
    pickers.push({
      id: d.prefix,
      type: d.type,
      name: d.name,
      key: pickerKey(d.name),
      values: labels.map(([value, label]) => ({ id: `${d.prefix}:${value}`, label, value, colorHex: d.type === "COLOR" ? colourHex(label) : null })),
    });
  }

  const variants: VariantSummary[] = rows.map((r) => ({
    id: variantKey(r.variant),
    valueIds: idsFor(r),
    offers: [
      {
        id: variantKey(r.variant),
        price: num(r.variant.price),
        stock: num(r.variant.quantity),
        warrantyMonths: warrantyMonths(r.variant.warranty_days),
        seller: { name: site.name, slug: "store", city: "" },
      },
    ],
  }));

  const imgs = ix.cat.images
    .filter((i) => i.family_slug === slug)
    .sort((a, b) => num(a.position) - num(b.position));
  const images = [...imgs.filter((i) => i.variant_product_id === null), ...imgs.filter((i) => i.variant_product_id !== null)].map((i: ImageRow) => i.url);
  if (images.length === 0 && family.cover_url) images.push(family.cover_url);

  const cheapest = rows[0];
  const compare = cheapest ? num(cheapest.variant.compare_price) : 0;
  const category = text(family.category);
  return {
    id: family.family_slug,
    slug: family.family_slug,
    name: family.title,
    description: family.description ?? listings.find((l) => l.description)?.description ?? null,
    newPrice: cheapest && compare > num(cheapest.variant.price) ? compare : null,
    releaseYear: null as number | null,
    brand: { name: text(family.brand), slug: slugify(text(family.brand)) },
    category: { name: category, slug: slugify(category), icon: kindOf(category, family.is_phone), parent: null as null | { name: string; slug: string; icon: string } },
    specs: {} as Record<string, string>,
    images,
    kind: kindOf(category, family.is_phone),
    pickers,
    variants,
  };
}

export type ProductPageData = NonNullable<ReturnType<typeof productPage>>;
