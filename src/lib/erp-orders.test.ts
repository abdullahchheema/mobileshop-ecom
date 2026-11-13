import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCartView, mergeItems, type CurrentVariant } from "./cart";
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
      delivery_fee: "0.00",
      expected_total: "57000.00",
      notes: "Call before delivery",
      customer: { name: "Ayesha Khan", phone: "+923214567890", address: "House 12, Street 4, Gulberg III, Punjab", city: "Lahore" },
    });
    expect(payload).not.toHaveProperty("payment_status"); // COD: collected on delivery
  });

  it("copies phones' condition, PTA status and type exactly, and sends the price as a string", () => {
    expect(payload.items[0]).toEqual({ product_id: "42", condition: "Very Good", pta_status: "PTA", device_type: "Used", price: "48000.00", quantity: 1 });
  });

  it("sends accessories with only the product, price and quantity", () => {
    expect(payload.items[1]).toEqual({ product_id: "77", price: "4500.00", quantity: 2 });
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
  it("classifies the ERP's real 409 messages", () => {
    const code = (error: string) => (classifyPlaceResponse(409, { error }, "r") as { code: string }).code;
    expect(code("iPhone 11 at PKR 48,000.00 is no longer available (it may have been sold, or its price changed).")).toBe("OUT_OF_STOCK");
    expect(code("Only 1 of iPhone 11 are available, not 2.")).toBe("OUT_OF_STOCK");
    expect(code("A product in this order does not exist any more.")).toBe("OUT_OF_STOCK");
    expect(code("The price of AirPods 2 changed to PKR 4,700.00. Refresh and try again.")).toBe("PRICE_CHANGED");
    expect(code("The total is now PKR 57,250.00, not PKR 57,000.00. Prices or delivery changed; refresh and try again.")).toBe("PRICE_CHANGED");
    expect(code("The delivery charge is now PKR 300.00, not PKR 250.00. Prices or delivery changed; refresh and try again.")).toBe("PRICE_CHANGED");
    // "not available right now" is about the payment method, not the stock: the cart must not be reported as sold out.
    expect(code("Cash on Delivery is not available right now. Choose another payment method.")).toBe("CONFLICT");
    expect(code("iPhone 11 is not for sale online.")).toBe("CONFLICT");
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
    expect(p.items[0]).toEqual({ product_id: "77", price: "4500.00", quantity: 1 });
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

describe("order limits", () => {
  it("passes the ERP's 429 on in the ERP's own words", () => {
    expect(classifyPlaceResponse(429, { error: "You already have 3 orders waiting for our confirmation call." }, "r")).toEqual({ ok: false, code: "RATE_LIMITED", message: "You already have 3 orders waiting for our confirmation call.", status: 429 });
    expect(classifyPlaceResponse(429, null, "r")).toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });
  it("sends the customer's address when it is known, and not a placeholder", () => {
    const base = { ref: "TM-1", customer: { name: "A", phone: "+923001234567", line1: "House 1", city: "Lahore", province: "PUNJAB" }, lines: [], deliveryFee: 0, expectedTotal: 0 };
    expect(buildOrderPayload({ ...base, clientIp: "203.0.113.5" })).toMatchObject({ client_ip: "203.0.113.5" });
    expect(buildOrderPayload({ ...base, clientIp: "unknown" })).not.toHaveProperty("client_ip");
    expect(buildOrderPayload(base)).not.toHaveProperty("client_ip");
  });
});

describe("money sent to the ERP", () => {
  // 10% off 99,999 is 89,999.10; three of them is 269,997.30. In binary floating point 89999.1 * 3 is 269997.30000000005, which the ERP
  // refuses ("at most two decimal places"), so every amount is added in paisa and sent as text with two decimals.
  const discounted: CurrentVariant = { ...phone, price: 89999.1, quantity: 5 };
  it("adds the cart up in paisa, free of binary-float noise", () => {
    expect(89999.1 * 3).not.toBe(269997.3); // the trap
    const view = buildCartView([{ key: "a", qty: 3 }], new Map([["a", discounted]]), () => 250);
    expect(view.totals).toEqual({ subtotal: 269997.3, shipping: 250, total: 270247.3 });
    const cents = buildCartView([{ key: "a", qty: 1 }, { key: "b", qty: 1 }], new Map([["a", { ...phone, price: 0.1 }], ["b", { ...phone, price: 0.2 }]]), () => 0);
    expect(cents.totals.total).toBe(0.3);
  });
  it("sends every amount as text with exactly two decimals", () => {
    const view = buildCartView([{ key: "a", qty: 3 }], new Map([["a", discounted]]), () => 250);
    const p = buildOrderPayload({ ref: "TM-1", customer: { name: "A", phone: "+923001234567", line1: "House 1", city: "Lahore", province: "PUNJAB" }, lines: [{ variant: discounted, quantity: 3 }], deliveryFee: view.totals.shipping, expectedTotal: view.totals.total });
    expect([p.delivery_fee, p.expected_total, p.items[0].price]).toEqual(["250.00", "270247.30", "89999.10"]);
    expect(JSON.stringify(p)).not.toMatch(/\d\.\d{3,}/); // no third decimal anywhere in the body
  });
  it("merges a variant listed twice into one line and caps the quantity", () => {
    expect(mergeItems([{ key: "a", qty: 2 }, { key: "b", qty: 1 }, { key: "a", qty: 3 }])).toEqual([{ key: "a", qty: 5 }, { key: "b", qty: 1 }]);
    expect(mergeItems([{ key: "a", qty: 40 }, { key: "a", qty: 40 }])).toEqual([{ key: "a", qty: 50 }]);
    const view = buildCartView([{ key: "a", qty: 1 }, { key: "a", qty: 1 }], new Map([["a", phone]]));
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0].quantity).toBe(2);
    expect(view.itemCount).toBe(2);
  });
});
