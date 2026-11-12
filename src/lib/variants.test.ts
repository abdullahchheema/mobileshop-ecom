import { describe, expect, it } from "vitest";
import { indexCatalogue, productPage } from "./erp-mapping";
import type { Catalogue } from "./erp-types";
import { findVariant, nearestBuyable, selectionFromParams, selectValue } from "./pricing";
import { getDict } from "@/i18n";

// A model with five colour/storage products. The ERP lists only what is in stock as variants; every product still has its listing.
const family = { family_slug: "iphone-17", title: "iPhone 17", brand: "Apple", category: "Phones", description: "d", specs: null, is_phone: true, price_from: null, price_to: null, discount_percent: 0, stock_total: 1, variant_count: 5, cover_url: "https://img.test/c.jpg" };
const listing = (id: number, storage: string, colour: string) => ({ product_id: id, slug: `p${id}`, family_slug: "iphone-17", page_title: null, name: `iPhone 17 ${storage} ${colour}`, brand: "Apple", model: "iPhone 17", storage, colour, category: "Phones", description: null, specs: null, is_phone: true, discount_percent: 0, price_from: null, price_to: null, stock_total: 0, cover_url: null });
const variant = (id: number, price: number, quantity: number) => ({ product_id: id, condition: "New", pta_status: "PTA", device_type: "Sealed", price, compare_price: null, quantity, grade: null, battery_health: null, warranty_days: 0 });
const catalogue = (inStock: number[]): Catalogue => ({
  families: [family],
  listings: [listing(1, "128GB", "Gold"), listing(2, "256GB", "Sierra Blue"), listing(3, "256GB", "Black"), listing(4, "512GB", "Black"), listing(5, "1TB", "Silver")],
  variants: inStock.map((id) => variant(id, 100000 + id * 10000, 1)),
  images: [], stock: [],
});
const open = (inStock: number[]) => productPage(indexCatalogue(catalogue(inStock)), "iphone-17")!;

describe("variants on a model page", () => {
  it("keeps a model with nothing in stock: every variant stays on the page and none can be bought", () => {
    const page = open([]);
    expect(page.soldOut).toBe(true);
    expect(page.variants).toHaveLength(5);
    expect(page.variants.every((x) => x.offers.length === 0)).toBe(true);
    expect(page.pickers.map((p) => p.values.length)).toEqual([4, 4]); // storages 128/256/512/1TB, colours Gold/Sierra/Black/Silver
  });

  it("with one of five in stock, the other four stay visible as out of stock", () => {
    const page = open([4]);
    expect(page.variants.filter((x) => x.offers.length > 0)).toHaveLength(1);
    expect(page.variants.filter((x) => x.offers.length === 0)).toHaveLength(4);
  });

  it("adding a 128GB Gold variant never selects or replaces the 256GB one", () => {
    const before = open([2]);
    const start = selectionFromParams(before.pickers, before.variants, {});
    expect(findVariant(before.variants, start)?.productId).toBe("2"); // the only thing in stock is the default
    const after = open([1, 2]);
    const gold128 = selectionFromParams(after.pickers, after.variants, { storage: "128gb", color: "gold" });
    expect(findVariant(after.variants, gold128)?.productId).toBe("1");
    const sierra256 = selectionFromParams(after.pickers, after.variants, { storage: "256gb", color: "sierra-blue" });
    expect(findVariant(after.variants, sierra256)?.productId).toBe("2");
    // two separate variants with their own prices
    expect(findVariant(after.variants, gold128)?.offers[0].price).not.toBe(findVariant(after.variants, sierra256)?.offers[0].price);
  });

  it("choosing an out-of-stock option changes only that option and shows it out of stock", () => {
    const page = open([1]);
    const start = selectionFromParams(page.pickers, page.variants, {});
    const storage = page.pickers.find((p) => p.type === "STORAGE")!;
    const value256 = storage.values.find((v) => v.label === "256GB")!;
    const picked = selectValue(page.pickers, page.variants, start, storage.id, value256.id);
    const colour = page.pickers.find((p) => p.type === "COLOR")!;
    expect(picked[colour.id]).toBe(start[colour.id]);                      // the colour was not touched
    expect(findVariant(page.variants, picked)?.offers ?? []).toEqual([]); // 256GB + Gold: out of stock, add to cart disabled
    // the explicit helper can still offer what is buyable
    const near = nearestBuyable(page.pickers, page.variants, start, storage.id, value256.id);
    expect(near).toEqual(start);                                           // nothing buyable has 256GB, so it offers nothing
  });
});

describe("no warranty label", () => {
  it("is never produced, in either language", () => {
    expect(getDict("en").common.monthWarranty(0)).toBe("");
    expect(getDict("ur").common.monthWarranty(0)).toBe("");
    expect(getDict("en").common.monthWarranty(6)).toContain("6");
  });
});
