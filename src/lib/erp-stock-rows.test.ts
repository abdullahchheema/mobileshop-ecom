import { describe, expect, it } from "vitest";
import { normalizeItems } from "./crm-stock";
import { type OnlineStockRow, rowsToSnapshotItems } from "./erp-stock-rows";

const row = (changes: Partial<OnlineStockRow> = {}): OnlineStockRow => ({
  product_code: "USED-IP11-64",
  product_name: "Used iPhone 11 64GB (Black)",
  condition: "Good",
  pta_status: "PTA",
  price: "39500.00",
  stock: "3",
  warranty_days: 0,
  ...changes,
});

describe("rowsToSnapshotItems", () => {
  it("maps view rows to the items the stock sync validates", () => {
    const [item] = rowsToSnapshotItems([row()], 365);
    expect(item).toEqual({
      productCode: "USED-IP11-64",
      productName: "Used iPhone 11 64GB (Black)",
      condition: "Good",
      pta: "PTA",
      price: "39500.00",
      stock: "3",
      warrantyDays: 365,
    });
    const { accepted, rejected } = normalizeItems([item]);
    expect(rejected).toEqual([]);
    expect(accepted[0]).toMatchObject({ price: 39500, stock: 3, warrantyMonths: 12 });
  });

  it("uses the device warranty when no override is set, and tolerates nulls", () => {
    expect(rowsToSnapshotItems([row({ warranty_days: 180 })])[0].warrantyDays).toBe(180);
    const [item] = rowsToSnapshotItems([row({ condition: null, pta_status: null, warranty_days: null })]);
    expect(item).toMatchObject({ condition: "", pta: "", warrantyDays: 0 });
  });

  it("keeps a short warranty so the sync rejects it instead of listing it", () => {
    const { accepted, rejected } = normalizeItems(rowsToSnapshotItems([row({ warranty_days: 90 })]));
    expect(accepted).toEqual([]);
    expect(rejected).toHaveLength(1);
  });
});
