import { describe, expect, it } from "vitest";
import { facets, indexCatalogue, isPtaApproved, listing, navCategories, num, productPage, variantKey, warrantyMonths } from "./erp-mapping";
import type { Catalogue } from "./erp-types";
import type { ListingFilters } from "./listing-params";

const family = (slug: string, title: string, category: string, extra = {}) => ({
  family_slug: slug, title, brand: "Apple", category, description: `${title} description`, is_phone: category === "Phones",
  price_from: null, price_to: null, discount_percent: 0, stock_total: 1, variant_count: 1, cover_url: `https://img.test/${slug}.jpg`, ...extra,
});
const l = (id: number, fam: string, storage: string | null, colour: string | null, category = "Phones") => ({
  product_id: id, slug: `${fam}-${id}`, family_slug: fam, page_title: null, name: `${fam} ${storage ?? ""} ${colour ?? ""}`, brand: "Apple", model: fam,
  storage, colour, category, description: null, is_phone: category === "Phones", discount_percent: 0, price_from: null, price_to: null, stock_total: 1, cover_url: null,
});
const v = (id: number, condition: string | null, pta: string | null, price: number, quantity: number, extra = {}) => ({
  product_id: id, condition, pta_status: pta, device_type: "Used", price, compare_price: null, quantity, grade: null, battery_health: null, warranty_days: 365, ...extra,
});

const cat: Catalogue = {
  families: [family("iphone-11", "iPhone 11", "Phones"), family("airpods-2", "AirPods 2", "Accessories", { brand: "Apple", is_phone: false }), family("pixel-6", "Pixel 6", "Phones", { brand: "Google" })],
  listings: [
    l(1, "iphone-11", "64GB", "Black"), l(2, "iphone-11", "128GB", "Black"), l(3, "iphone-11", "128GB", "White"),
    l(4, "airpods-2", null, "White", "Accessories"), l(5, "pixel-6", "128GB", "Green"),
  ],
  variants: [
    v(1, "Good", "PTA", 39500, 3, { compare_price: 60000 }), v(2, "Very Good", "PTA", 48000, 2), v(2, "Good", "Non-PTA", 44000, 1),
    v(3, "Excellent", "PTA", 55000, 1, { warranty_days: 0 }), v(4, null, null, 4500, 10), v(5, "Good", "PTA", 52000, 0), // pixel: sold out
  ],
  images: [
    { image_id: 2, family_slug: "iphone-11", variant_product_id: 2, product_id: 2, url: "https://img.test/black128.jpg", alt: null, position: 1 },
    { image_id: 1, family_slug: "iphone-11", variant_product_id: null, product_id: null, url: "https://img.test/cover.jpg", alt: null, position: 0 },
  ],
};
const ix = indexCatalogue(cat);
const filters = (changes: Partial<ListingFilters> = {}): ListingFilters => ({ brands: [], storages: [], conditions: [], years: [], ptaOnly: false, sort: "popular", page: 1, ...changes });

describe("helpers", () => {
  it("reads numbers from Postgres numeric strings", () => {
    expect(num("39500.00")).toBe(39500);
    expect(num(null)).toBe(0);
    expect(num("x")).toBe(0);
  });
  it("tells PTA approved from non-PTA", () => {
    expect(isPtaApproved("PTA")).toBe(true);
    expect(isPtaApproved("PTA Approved")).toBe(true);
    expect(isPtaApproved("Non-PTA")).toBe(false);
    expect(isPtaApproved("Not recorded")).toBe(false);
    expect(isPtaApproved(null)).toBe(false);
  });
  it("turns warranty days into months, defaulting to the store promise", () => {
    expect(warrantyMonths(365)).toBe(12);
    expect(warrantyMonths(180)).toBe(6);
    expect(warrantyMonths(0)).toBe(12);
    expect(warrantyMonths(null)).toBe(12);
  });
  it("builds a stable variant key", () => {
    expect(variantKey({ product_id: 2, condition: "Good", pta_status: "Non-PTA", device_type: "Used" })).toBe("2|Good|Non-PTA|Used");
  });
});

describe("navigation and listing", () => {
  it("derives categories from the ERP's own names", () => {
    expect(navCategories(ix).map((c) => [c.name, c.slug, c.icon])).toEqual([["Accessories", "accessories", "smartphone"], ["Phones", "phones", "smartphone"]]);
  });

  it("lists models that have stock, cheapest price first on request, and hides sold-out models", () => {
    const all = listing(ix, filters({ sort: "price-asc" }), 24);
    expect(all.items.map((c) => [c.slug, c.fromPrice])).toEqual([["airpods-2", 4500], ["iphone-11", 39500]]);
    expect(all.total).toBe(2);
  });

  it("shows the was-price saving on the card", () => {
    const card = listing(ix, filters({ category: "phones" }), 24).items[0];
    expect(card).toMatchObject({ slug: "iphone-11", fromPrice: 39500, newPrice: 60000, savings: 34, offerCount: 4 });
    expect(card.colors.map((c) => c.label)).toEqual(["Black", "White"]);
  });

  it("filters by condition, storage and PTA, and prices the card from the matching variants", () => {
    expect(listing(ix, filters({ conditions: ["excellent"] }), 24).items[0].fromPrice).toBe(55000);
    expect(listing(ix, filters({ storages: ["128gb"] }), 24).items[0].fromPrice).toBe(44000);
    expect(listing(ix, filters({ ptaOnly: true, storages: ["128gb"] }), 24).items[0].fromPrice).toBe(48000);
    expect(listing(ix, filters({ conditions: ["fair"] }), 24).total).toBe(0);
  });

  it("searches title, brand and category, with every word required", () => {
    expect(listing(ix, filters({ q: "iphone 11" }), 24).total).toBe(1);
    expect(listing(ix, filters({ q: "apple" }), 24).total).toBe(2);
    expect(listing(ix, filters({ q: "pixel" }), 24).total).toBe(0); // sold out
    expect(listing(ix, filters({ q: "iphone galaxy" }), 24).total).toBe(0);
  });

  it("applies price range and pagination", () => {
    expect(listing(ix, filters({ minPrice: 10000 }), 24).items.map((c) => c.slug)).toEqual(["iphone-11"]);
    const paged = listing(ix, filters(), 1);
    expect([paged.items.length, paged.pageCount, paged.total]).toEqual([1, 2, 2]);
  });

  it("offers only filter choices that exist", () => {
    const f = facets(ix, "phones");
    expect(f.brands.map((b) => b.label)).toEqual(["Apple"]); // Google's Pixel is sold out
    expect(f.storages.map((s) => s.label)).toEqual(["64GB", "128GB"]);
    expect(f.conditions.map((c) => c.label).sort()).toEqual(["Excellent", "Good", "Very Good"]);
    expect(f.hasPta).toBe(true);
  });
});

describe("product page", () => {
  const page = productPage(ix, "iphone-11")!;

  it("makes pickers only for real choices, with the right types", () => {
    expect(page.pickers.map((p) => [p.type, p.key, p.values.map((x) => x.label)])).toEqual([
      ["STORAGE", "storage", ["64GB", "128GB"]],
      ["COLOR", "color", ["Black", "White"]],
      ["CONDITION", "condition", ["Good", "Very Good", "Excellent"]],
      ["SIM", "pta-status", ["PTA", "Non-PTA"]],
    ]); // "Type" is not offered: every phone is Used
  });

  it("maps each ERP variant to one buyable offer with its price, stock and warranty", () => {
    const first = page.variants[0];
    expect(first.offers).toHaveLength(1);
    expect(first.offers[0]).toMatchObject({ id: "1|Good|PTA|Used", price: 39500, stock: 3, warrantyMonths: 12 });
    expect(page.variants.find((x) => x.id === "3|Excellent|PTA|Used")?.offers[0].warrantyMonths).toBe(12);
    expect(page.variants.map((x) => x.offers[0].price)).toEqual([39500, 44000, 48000, 55000]);
  });

  it("gives each variant the ids of its picker values", () => {
    expect(page.variants.find((x) => x.id === "2|Good|Non-PTA|Used")?.valueIds.sort()).toEqual(
      ["color:black", "condition:good", "pta:non-pta", "storage:128gb", "type:used"].sort(),
    );
  });

  it("puts page-wide photos first, then variant photos, and shows the was-price", () => {
    expect(page.images).toEqual(["https://img.test/cover.jpg", "https://img.test/black128.jpg"]);
    expect(page.newPrice).toBe(60000);
    expect(page.category).toMatchObject({ name: "Phones", slug: "phones" });
    expect(page.brand).toEqual({ name: "Apple", slug: "apple" });
  });

  it("returns null for an unknown model and an empty buy box for a sold-out one", () => {
    expect(productPage(ix, "nope")).toBeNull();
    const sold = productPage(ix, "pixel-6")!;
    expect(sold.variants).toEqual([]);
    expect(sold.pickers).toEqual([]);
  });
});
