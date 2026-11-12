import { describe, expect, it } from "vitest";
import { buildCartView, type CurrentVariant } from "./cart";
import { buildOrderPayload, classifyPlaceResponse } from "./erp-orders";

const phone: CurrentVariant = { price: 48000, quantity: 2, warrantyMonths: 12, productId: "42", condition: "Very Good", pta: "PTA", type: "Used", name: "iPhone 11", slug: "iphone-11", image: null, label: "128GB · Black", kind: "smartphone" };
const accessory: CurrentVariant = { ...phone, price: 4500, quantity: 10, productId: "77", condition: null, pta: null, type: null, name: "AirPods 2", slug: "airpods-2" };

describe("buildOrderPayload", () => {
  const payload = buildOrderPayload({
    ref: "TM-AB12CD34EF56",
    customer: { name: "Ayesha Khan", phone: "+923214567890", line1: "House 12, Street 4, Gulberg III", city: "Lahore", province: "PUNJAB" },
    notes: "Call before delivery",
    lines: [{ variant: phone, quantity: 1 }, { variant: accessory, quantity: 2 }],
    deliveryFee: 0,
    expectedTotal: 57000,
  });

  it("follows the ERP's order contract", () => {
    expect(payload).toMatchObject({
      external_ref: "TM-AB12CD34EF56",
      payment_method: "Cash on Delivery",
      delivery_fee: 0,
      expected_total: 57000,
      notes: "Call before delivery",
      customer: { name: "Ayesha Khan", phone: "+923214567890", address: "House 12, Street 4, Gulberg III, Punjab", city: "Lahore" },
    });
    expect(payload).not.toHaveProperty("payment_status"); // COD: collected on delivery
  });

  it("copies phones' condition, PTA status and type exactly, and sends the price as a string", () => {
    expect(payload.items[0]).toEqual({ product_id: "42", condition: "Very Good", pta_status: "PTA", device_type: "Used", price: "48000", quantity: 1 });
  });

  it("sends accessories with only the product, price and quantity", () => {
    expect(payload.items[1]).toEqual({ product_id: "77", price: "4500", quantity: 2 });
  });
});

describe("classifyPlaceResponse", () => {
  it("treats 201 and 200 (same ref sent again) as success", () => {
    expect(classifyPlaceResponse(201, { external_ref: "TM-1", total: "57000.00", status: "New", created: true }, "TM-X")).toEqual({ ok: true, ref: "TM-1", total: 57000, status: "New", created: true });
    expect(classifyPlaceResponse(200, { external_ref: "TM-1", total: 57000, created: false }, "TM-X")).toMatchObject({ ok: true, created: false });
  });
  it("maps 409 to what the customer should do", () => {
    expect(classifyPlaceResponse(409, { error: "Price changed for iPhone 11" }, "r")).toMatchObject({ ok: false, code: "PRICE_CHANGED" });
    expect(classifyPlaceResponse(409, { error: "Not enough stock for iPhone 11" }, "r")).toMatchObject({ ok: false, code: "OUT_OF_STOCK" });
    expect(classifyPlaceResponse(409, { error: "Total differs" }, "r")).toMatchObject({ ok: false, code: "CONFLICT" });
  });
  it("shows validation messages but hides key and server problems", () => {
    expect(classifyPlaceResponse(400, { error: "Customer phone must have at least 10 digits" }, "r")).toMatchObject({ code: "INVALID", message: "Customer phone must have at least 10 digits" });
    for (const status of [401, 403, 500, 502]) {
      const r = classifyPlaceResponse(status, { error: "secret details" }, "r");
      expect(r).toMatchObject({ ok: false, code: "UNAVAILABLE" });
      expect((r as { message: string }).message).not.toContain("secret");
    }
  });
});

describe("buildCartView", () => {
  const current = new Map([["a", phone], ["b", accessory]]);
  it("prices lines from the ERP, adds delivery under the free threshold and totals", () => {
    const view = buildCartView([{ key: "b", qty: 2 }], current);
    expect(view.totals).toEqual({ subtotal: 9000, shipping: 250, total: 9250 });
    expect(view.lines[0]).toMatchObject({ name: "AirPods 2", price: 4500, quantity: 2, available: true, href: "/p/airpods-2" });
  });
  it("delivers free from Rs 30,000", () => {
    expect(buildCartView([{ key: "a", qty: 1 }], current).totals).toEqual({ subtotal: 48000, shipping: 0, total: 48000 });
  });
  it("flags lines that are sold out, short of stock or gone, and leaves them out of the total", () => {
    const view = buildCartView([{ key: "a", qty: 3 }, { key: "gone", qty: 1 }, { key: "b", qty: 1 }], current);
    expect(view.hasUnavailable).toBe(true);
    expect(view.lines.map((l) => [l.key, l.available, l.stock])).toEqual([["a", false, 2], ["gone", false, 0], ["b", true, 10]]);
    expect(view.totals.subtotal).toBe(4500);
  });
  it("caps a quantity at 5 and at the stock", () => {
    expect(buildCartView([{ key: "b", qty: 9 }], current).lines[0]).toMatchObject({ quantity: 5, maxQuantity: 5 });
    expect(buildCartView([{ key: "a", qty: 1 }], current).lines[0].maxQuantity).toBe(2);
  });
});
