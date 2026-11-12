import { describe, expect, it } from "vitest";
import {
  defaultSelection,
  findVariant,
  nearestBuyable,
  type OfferSummary,
  type Picker,
  pickerStates,
  priceSummary,
  savingsPercent,
  selectionFromParams,
  selectionToParams,
  selectValue,
  type VariantSummary,
} from "./pricing";

const value = (id: string) => ({ id, label: id, value: id, colorHex: null });

const pickers: Picker[] = [
  { id: "cond", type: "CONDITION", name: "Condition", key: "condition", values: [value("fair"), value("good")] },
  { id: "sto", type: "STORAGE", name: "Storage", key: "storage", values: [value("128"), value("256")] },
  { id: "pta", type: "SIM", name: "PTA status", key: "pta-status", values: [value("pta"), value("non-pta")] },
  { id: "col", type: "COLOR", name: "Color", key: "color", values: [value("black"), value("blue")] },
];

const offer = (price: number): OfferSummary => ({
  id: `o${price}`,
  price,
  stock: 1,
  warrantyMonths: 12,
  seller: { name: "S", slug: "s", city: "Lahore" },
});

// Prices chosen so each rule below has exactly one right answer.
const variants: VariantSummary[] = [
  { id: "fair-128-pta-black", valueIds: ["fair", "128", "pta", "black"], offers: [offer(100), offer(110)] },
  { id: "fair-128-non-black", valueIds: ["fair", "128", "non-pta", "black"], offers: [offer(80)] },
  { id: "fair-128-pta-blue", valueIds: ["fair", "128", "pta", "blue"], offers: [] },
  { id: "fair-256-pta-black", valueIds: ["fair", "256", "pta", "black"], offers: [] },
  { id: "good-128-pta-blue", valueIds: ["good", "128", "pta", "blue"], offers: [offer(130)] },
  { id: "good-256-pta-blue", valueIds: ["good", "256", "pta", "blue"], offers: [offer(150)] },
  { id: "good-256-pta-black", valueIds: ["good", "256", "pta", "black"], offers: [offer(160)] },
];

const sel = (cond: string, sto: string, pta: string, col: string) => ({ cond, sto, pta, col });

describe("defaultSelection", () => {
  it("picks the cheapest buyable variant so it matches the listing's From price", () => {
    expect(defaultSelection(pickers, variants)).toEqual(sel("fair", "128", "non-pta", "black"));
  });

  it("can require specific values", () => {
    expect(defaultSelection(pickers, variants, ["pta"])).toEqual(sel("fair", "128", "pta", "black"));
  });

  it("falls back to first values when nothing is in stock", () => {
    const soldOut = variants.map((v) => ({ ...v, offers: [] }));
    expect(defaultSelection(pickers, soldOut)).toEqual(sel("fair", "128", "pta", "black"));
  });
});

describe("findVariant", () => {
  it("matches the variant containing every selected value", () => {
    expect(findVariant(variants, sel("good", "256", "pta", "blue"))?.id).toBe("good-256-pta-blue");
  });
});

describe("pickerStates", () => {
  const current = sel("fair", "128", "pta", "black");

  it("shows the exact price when switching keeps the combination buyable", () => {
    const states = pickerStates(pickers[2], variants, current);
    expect(states).toEqual([
      { valueId: "pta", status: "exact", price: 100 },
      { valueId: "non-pta", status: "exact", price: 80 },
    ]);
  });

  it("marks a value as alternative (with its lowest price) when the exact combination is sold out", () => {
    const [, storage256] = pickerStates(pickers[1], variants, current);
    expect(storage256).toEqual({ valueId: "256", status: "alternative", price: 150 });
  });

  it("marks a value as out of stock (still selectable) when it exists but none is in stock", () => {
    const noBlue = variants.map((v) => (v.valueIds.includes("blue") ? { ...v, offers: [] } : v));
    const [, blue] = pickerStates(pickers[3], noBlue, current);
    expect(blue).toEqual({ valueId: "blue", status: "soldout", price: null });
  });
  it("marks a value as unavailable only when no variant has it at all", () => {
    const none = variants.filter((v) => !v.valueIds.includes("blue"));
    const [, blue] = pickerStates(pickers[3], none, current);
    expect(blue).toEqual({ valueId: "blue", status: "unavailable", price: null });
  });
});

describe("selectValue", () => {
  const current = sel("fair", "128", "pta", "black");

  it("keeps the other choices when the new combination is buyable", () => {
    expect(selectValue(pickers, variants, current, "pta", "non-pta")).toEqual(sel("fair", "128", "non-pta", "black"));
  });

  it("never silently moves to another variant: only the chosen option changes", () => {
    const next = selectValue(pickers, variants, current, "sto", "256");
    expect(next).toEqual(sel("fair", "256", "pta", "black"));
    expect(findVariant(variants, next)?.offers ?? []).toEqual([]); // fair/256 is sold out: the page says so
  });
  it("lets an out-of-stock value be chosen (the page shows it as out of stock)", () => {
    const noBlue = variants.map((v) => (v.valueIds.includes("blue") ? { ...v, offers: [] } : v));
    const next = selectValue(pickers, noBlue, current, "col", "blue");
    expect(next.col).toBe("blue");
  });
  it("nearestBuyable (the explicit 'show an available option' action) keeps earlier pickers first", () => {
    // fair/256 is sold out, so condition must change; color black is kept (good-256-pta-black) even though good-256-pta-blue is cheaper.
    expect(nearestBuyable(pickers, variants, current, "sto", "256")).toEqual(sel("good", "256", "pta", "black"));
  });
  it("nearestBuyable ignores a value no variant has", () => {
    const none = variants.filter((v) => !v.valueIds.includes("blue"));
    expect(nearestBuyable(pickers, none, current, "col", "blue")).toEqual(current);
  });
});

describe("URL params", () => {
  it("round-trips a selection through query params", () => {
    const selection = sel("good", "256", "pta", "blue");
    const params = Object.fromEntries(selectionToParams(pickers, selection));
    expect(params).toEqual({ condition: "good", storage: "256", "pta-status": "pta", color: "blue" });
    expect(selectionFromParams(pickers, variants, params)).toEqual(selection);
  });

  it("fills pickers missing from the URL with the cheapest matching choice", () => {
    // Only storage=256 given: cheapest buyable 256 is good-256-pta-blue (150), not -black (160).
    expect(selectionFromParams(pickers, variants, { storage: "256" })).toEqual(sel("good", "256", "pta", "blue"));
  });

  it("keeps exactly what a link asks for, even when that combination is out of stock", () => {
    const picked = selectionFromParams(pickers, variants, { condition: "fair", storage: "256", color: "nope" });
    expect([picked.cond, picked.sto]).toEqual(["fair", "256"]);            // honoured, not swapped for something buyable
    expect(findVariant(variants, picked)?.offers ?? []).toEqual([]);        // and shown as out of stock
  });
});

describe("summaries", () => {
  it("summarises buyable prices", () => {
    expect(priceSummary(variants)).toEqual({ min: 80, max: 160, offerCount: 6 });
    expect(priceSummary([])).toBeNull();
  });

  it("computes savings vs new", () => {
    expect(savingsPercent(50, 200)).toBe(75);
    expect(savingsPercent(250, 200)).toBe(0);
    expect(savingsPercent(100, null)).toBe(0);
  });
});
