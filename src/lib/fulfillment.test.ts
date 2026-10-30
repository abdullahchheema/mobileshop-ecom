import { describe, expect, it } from "vitest";
import { allowedActions, canApply, rollupOrderStatus, sellerEarning } from "./fulfillment";

describe("transitions", () => {
  it("follows confirm → ship → deliver", () => {
    expect(allowedActions("PENDING")).toEqual(["confirm", "cancel"]);
    expect(canApply("CONFIRMED", "ship")).toBe(true);
    expect(canApply("SHIPPED", "deliver")).toBe(true);
  });

  it("can't skip steps or cancel once shipped", () => {
    expect(canApply("PENDING", "ship")).toBe(false);
    expect(canApply("PENDING", "deliver")).toBe(false);
    expect(canApply("SHIPPED", "cancel")).toBe(false);
    expect(allowedActions("DELIVERED")).toEqual([]);
  });
});

describe("rollupOrderStatus", () => {
  it.each([
    [["PENDING", "PENDING"], "PENDING"],
    [["CONFIRMED", "PENDING"], "PENDING"],
    [["CONFIRMED", "CONFIRMED"], "CONFIRMED"],
    [["SHIPPED", "CONFIRMED"], "PARTIALLY_SHIPPED"],
    [["SHIPPED", "DELIVERED"], "SHIPPED"],
    [["DELIVERED", "DELIVERED"], "DELIVERED"],
    [["DELIVERED", "CANCELLED"], "DELIVERED"],
    [["CANCELLED", "CANCELLED"], "CANCELLED"],
    [["CONFIRMED", "CANCELLED"], "CONFIRMED"],
    [["RETURNED"], "RETURNED"],
    [["RETURNED", "CANCELLED"], "RETURNED"],
    [["RETURNED", "DELIVERED"], "DELIVERED"],
  ] as const)("%j → %s", (statuses, expected) => {
    expect(rollupOrderStatus([...statuses])).toBe(expected);
  });
});

describe("sellerEarning", () => {
  it("is subtotal plus delivery fee minus commission", () => {
    expect(sellerEarning({ subtotal: 100000, shippingFee: 250, commission: 10000 })).toBe(90250);
  });
});
