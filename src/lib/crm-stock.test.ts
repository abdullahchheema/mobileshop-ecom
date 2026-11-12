import { describe, expect, it } from "vitest";
import { ackSchema, updatesAckSchema, applyPending, combineByVariant, groupKey, normalizeItems, snapshotSchema, suggestProductId } from "./crm-stock";

const item = (over: Record<string, unknown> = {}) => ({
  productCode: "IP14-128-BLK",
  productName: "iPhone 14 128GB Black",
  condition: "Good",
  pta: "PTA",
  price: "125000.00",
  stock: 3,
  warrantyDays: 365,
  ...over,
});

describe("normalizeItems", () => {
  it("accepts a valid group and converts Django decimals", () => {
    const { accepted, rejected } = normalizeItems([item()]);
    expect(rejected).toEqual([]);
    expect(accepted).toEqual([
      {
        productCode: "IP14-128-BLK",
        productName: "iPhone 14 128GB Black",
        condition: "Good",
        pta: "PTA",
        price: 125000,
        stock: 3,
        warrantyMonths: 12,
      },
    ]);
  });

  it("rounds prices to whole rupees", () => {
    expect(normalizeItems([item({ price: "99999.60" })]).accepted[0].price).toBe(100000);
  });

  it("rejects the ERP default price of zero and absurd prices", () => {
    const { accepted, rejected } = normalizeItems([item({ price: 0 }), item({ productCode: "B", price: 9_000_000 })]);
    expect(accepted).toEqual([]);
    expect(rejected).toHaveLength(2);
    expect(rejected[0].reason).toMatch(/outside/);
  });

  it("rejects warranties shorter than Trendz's 12-month minimum instead of overstating them", () => {
    const { accepted, rejected } = normalizeItems([item({ warrantyDays: 90 })]);
    expect(accepted).toEqual([]);
    expect(rejected[0].reason).toMatch(/12-month/);
  });

  it("caps stock at 999 and warranty at 36 months", () => {
    const [a] = normalizeItems([item({ stock: 5000, warrantyDays: 2000 })]).accepted;
    expect(a.stock).toBe(999);
    expect(a.warrantyMonths).toBe(36);
  });

  it("rejects fractional or negative stock", () => {
    expect(normalizeItems([item({ stock: 1.5 })]).rejected).toHaveLength(1);
    expect(normalizeItems([item({ stock: -1 })]).rejected).toHaveLength(1);
  });

  it("fills blank condition and PTA, and rejects duplicate groups", () => {
    const { accepted, rejected } = normalizeItems([item({ condition: "", pta: "" }), item({ condition: "", pta: "" })]);
    expect(accepted[0].condition).toBe("Not recorded");
    expect(accepted[0].pta).toBe("Not recorded");
    expect(rejected[0].reason).toMatch(/Duplicate/);
  });

  it("keeps good rows when others are malformed", () => {
    const { accepted, rejected } = normalizeItems([null, { nope: 1 }, item()]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(2);
  });
});

describe("suggestProductId", () => {
  const products = [
    { id: "pro", name: "iPhone 16 Pro" },
    { id: "promax", name: "iPhone 16 Pro Max" },
    { id: "base", name: "iPhone 16" },
    { id: "s24", name: "Galaxy S24" },
  ];

  it("prefers the longest product name contained in the ERP name", () => {
    expect(suggestProductId("Apple iPhone 16 Pro Max 256GB Black", products)).toBe("promax");
    expect(suggestProductId("iphone 16 pro 128gb", products)).toBe("pro");
    expect(suggestProductId("IPHONE-16 256GB", products)).toBe("base");
  });

  it("suggests nothing when no product name fits", () => {
    expect(suggestProductId("Pixel 9", products)).toBeNull();
    expect(suggestProductId("Samsung Galaxy S23", products)).toBeNull();
  });
});

describe("groupKey", () => {
  it("differs by condition and PTA status", () => {
    const base = { productCode: "X", condition: "Good", pta: "PTA" };
    expect(groupKey(base)).not.toBe(groupKey({ ...base, pta: "Non-PTA" }));
    expect(groupKey(base)).not.toBe(groupKey({ ...base, condition: "Fair" }));
  });
});

describe("combineByVariant", () => {
  it("sums stock, takes the cheapest price and shortest warranty among in-stock groups", () => {
    const [v] = combineByVariant([
      { variantId: "v1", price: 120000, stock: 2, warrantyMonths: 12 },
      { variantId: "v1", price: 118000, stock: 1, warrantyMonths: 6 + 6 },
      { variantId: "v1", price: 90000, stock: 0, warrantyMonths: 12 },
    ]);
    expect(v).toEqual({ variantId: "v1", stock: 3, price: 118000, warrantyMonths: 12 });
  });

  it("falls back to all groups when nothing is in stock", () => {
    const [v] = combineByVariant([{ variantId: "v1", price: 100000, stock: 0, warrantyMonths: 12 }]);
    expect(v.stock).toBe(0);
    expect(v.price).toBe(100000);
  });

  it("keeps separate variants apart", () => {
    expect(combineByVariant([
      { variantId: "a", price: 1000, stock: 1, warrantyMonths: 12 },
      { variantId: "b", price: 2000, stock: 1, warrantyMonths: 12 },
    ])).toHaveLength(2);
  });
});

describe("snapshotSchema", () => {
  it("defaults to a full snapshot and limits its size", () => {
    expect(snapshotSchema.parse({ items: [] }).full).toBe(true);
    expect(snapshotSchema.safeParse({ items: new Array(5001).fill({}) }).success).toBe(false);
  });
});

describe("applyPending", () => {
  it("subtracts unbooked online units and never goes below zero", () => {
    const rows = [
      { variantId: "a", stock: 5 },
      { variantId: "b", stock: 1 },
      { variantId: "c", stock: 4 },
    ];
    const out = applyPending(rows, new Map([["a", 2], ["b", 3]]));
    expect(out.map((r) => r.stock)).toEqual([3, 0, 4]);
    expect(rows[0].stock).toBe(5); // input untouched
  });
});

describe("ackSchema", () => {
  it("accepts booked results with documents and failed results with a reason", () => {
    const ok = ackSchema.safeParse({
      results: [
        { sellerOrderId: "o1", status: "BOOKED", documents: ["SALE-1", "SALE-2"] },
        { sellerOrderId: "o2", status: "FAILED", reason: "Phone sold in the shop first" },
      ],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects booked without documents, failed without a reason, unknown statuses and empty lists", () => {
    expect(ackSchema.safeParse({ results: [{ sellerOrderId: "o", status: "BOOKED", documents: [] }] }).success).toBe(false);
    expect(ackSchema.safeParse({ results: [{ sellerOrderId: "o", status: "FAILED", reason: " " }] }).success).toBe(false);
    expect(ackSchema.safeParse({ results: [{ sellerOrderId: "o", status: "PENDING" }] }).success).toBe(false);
    expect(ackSchema.safeParse({ results: [] }).success).toBe(false);
  });
});

describe("updatesAckSchema", () => {
  it("accepts each kind, defaulting documents to none", () => {
    const parsed = updatesAckSchema.parse({
      results: [
        { kind: "COLLECTED", id: "so1" },
        { kind: "REVERSED", id: "so2", documents: ["SALE-1"] },
        { kind: "RETURNED", id: "ret1", documents: ["SALE-9", "PAY-2"] },
      ],
    });
    expect(parsed.results[0].documents).toEqual([]);
  });

  it("rejects unknown kinds, missing ids and empty lists", () => {
    expect(updatesAckSchema.safeParse({ results: [{ kind: "SHIPPED", id: "x" }] }).success).toBe(false);
    expect(updatesAckSchema.safeParse({ results: [{ kind: "COLLECTED", id: "" }] }).success).toBe(false);
    expect(updatesAckSchema.safeParse({ results: [] }).success).toBe(false);
  });
});
