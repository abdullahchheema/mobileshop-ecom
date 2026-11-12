import { describe, expect, it } from "vitest";
import { FREE_SHIPPING_FROM, SHIPPING_FEE, shipmentFee } from "./shipping";

describe("shipmentFee", () => {
  it("charges below the threshold and is free from it", () => {
    expect(shipmentFee(FREE_SHIPPING_FROM - 1)).toBe(SHIPPING_FEE);
    expect(shipmentFee(FREE_SHIPPING_FROM)).toBe(0);
  });
});
