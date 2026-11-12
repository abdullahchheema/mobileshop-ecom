import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCartView, type CurrentVariant } from "./cart";
import { buildOrderPayload, classifyPlaceResponse, placeErpOrder } from "./erp-orders";

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
  it("caps a quantity at 50 and at the stock", () => {
    expect(buildCartView([{ key: "b", qty: 99 }], current).lines[0]).toMatchObject({ quantity: 50, maxQuantity: 10, available: false });
    expect(buildCartView([{ key: "b", qty: 9 }], current).lines[0]).toMatchObject({ quantity: 9, maxQuantity: 10, available: true });
    expect(buildCartView([{ key: "a", qty: 1 }], current).lines[0].maxQuantity).toBe(2);
  });
});

describe("order payload extras", () => {
  const base = { ref: "TM-1", customer: { name: "A B", phone: "+923001234567", line1: "House 1, Street 2", city: "Lahore", province: "PUNJAB" }, deliveryFee: 0, expectedTotal: 4500 };
  it("sends accessories without empty condition/pta/type", () => {
    const p = buildOrderPayload({ ...base, lines: [{ variant: { ...accessory, condition: "", pta: "", type: "" }, quantity: 1 }] });
    expect(p.items[0]).toEqual({ product_id: "77", price: "4500", quantity: 1 });
  });
  it("carries the chosen payment method and reference, and never marks the order paid", () => {
    const p = buildOrderPayload({ ...base, paymentMethod: "Easypaisa", paymentReference: "TX123", lines: [{ variant: accessory, quantity: 1 }] });
    expect(p).toMatchObject({ payment_method: "Easypaisa", payment_reference: "TX123" });
    expect(p).not.toHaveProperty("payment_status");
  });
});

describe("placeErpOrder", () => {
  const order = { ref: "TM-1", customer: { name: "A B", phone: "+923001234567", line1: "House 1, Street 2", city: "Lahore", province: "PUNJAB" }, deliveryFee: 0, expectedTotal: 4500, lines: [{ variant: accessory, quantity: 1 }] };
  const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  beforeEach(() => {
    process.env.ERP_API_URL = "https://erp.test";
    process.env.ERP_API_KEY = "k";
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends the key in X-API-Key only", async () => {
    let seen: RequestInit | undefined;
    const f = (async (_u: string, init?: RequestInit) => ((seen = init), new Response(JSON.stringify({ external_ref: "TM-1", total: 4500 }), { status: 201 }))) as unknown as typeof fetch;
    const r = await placeErpOrder(order, f);
    expect(r).toMatchObject({ ok: true, created: true });
    expect((seen!.headers as Record<string, string>)["X-API-Key"]).toBe("k");
    expect(String(seen!.body)).not.toContain("\"k\"");
  });
  it("treats 200 created:false as success (a retry of an order that already exists)", async () => {
    expect(await placeErpOrder(order, reply(200, { external_ref: "TM-1", created: false, total: 4500 }))).toMatchObject({ ok: true, created: false });
  });
  it("gives a generic message on 401 and logs it loudly", async () => {
    const r = await placeErpOrder(order, reply(401, { error: "bad key" }));
    expect(r).toMatchObject({ ok: false, code: "UNAVAILABLE", status: 401 });
    expect((r as { message: string }).message).not.toMatch(/key/i);
    expect(console.error).toHaveBeenCalled();
  });
  it("reports a 5xx and a network failure as unavailable", async () => {
    expect(await placeErpOrder(order, reply(503, {}))).toMatchObject({ ok: false, code: "UNAVAILABLE" });
    const down = (async () => { throw new Error("ECONNRESET"); }) as unknown as typeof fetch;
    expect(await placeErpOrder(order, down)).toMatchObject({ ok: false, code: "UNAVAILABLE", status: 0 });
  });
});
