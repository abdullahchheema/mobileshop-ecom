import { describe, expect, it } from "vitest";
import { commission, FREE_SHIPPING_FROM, orderTotals, SHIPPING_FEE, shipmentFee } from "./shipping";

describe("shipmentFee", () => {
  it("charges below the threshold and is free from it", () => {
    expect(shipmentFee(FREE_SHIPPING_FROM - 1)).toBe(SHIPPING_FEE);
    expect(shipmentFee(FREE_SHIPPING_FROM)).toBe(0);
  });
});

describe("orderTotals", () => {
  it("charges shipping per seller shipment", () => {
    const totals = orderTotals([
      { sellerId: "a", lines: [{ price: 100000, quantity: 1 }] },
      { sellerId: "b", lines: [{ price: 5000, quantity: 2 }] },
    ]);
    expect(totals.perSeller).toEqual([
      { sellerId: "a", subtotal: 100000, shipping: 0 },
      { sellerId: "b", subtotal: 10000, shipping: SHIPPING_FEE },
    ]);
    expect(totals).toMatchObject({ subtotal: 110000, shipping: SHIPPING_FEE, total: 110000 + SHIPPING_FEE });
  });

  it("handles an empty cart", () => {
    expect(orderTotals([])).toMatchObject({ subtotal: 0, shipping: 0, total: 0 });
  });
});

describe("commission", () => {
  it("applies basis points and rounds to whole rupees", () => {
    expect(commission(125000, 1000)).toBe(12500);
    expect(commission(999, 750)).toBe(75);
  });
});
