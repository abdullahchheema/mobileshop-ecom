import { describe, expect, it } from "vitest";
import { buildOrderPayload } from "./erp-orders";
import { DEFAULT_STORE_CONFIG, deliveryFee, parseStoreConfig, type StoreConfig } from "./store-config";

const config: StoreConfig = {
  delivery: { fee: 300, freeFrom: 100000, provinces: [{ province: "Sindh", fee: 500 }] },
  paymentMethods: [{ method: "Cash on Delivery", accounts: [] }, { method: "JazzCash", accounts: [{ title: "Trends", bankName: "", accountNumber: "0300", iban: "", instructions: "" }] }],
};

describe("delivery pricing from the ERP", () => {
  it("is free from the free-delivery amount, else the province's fee, else the default", () => {
    expect(deliveryFee(config, 50000, "Punjab")).toBe(300);
    expect(deliveryFee(config, 50000, "sindh")).toBe(500);
    expect(deliveryFee(config, 100000, "Sindh")).toBe(0);
    expect(deliveryFee(config, 0, "Sindh")).toBe(0);
  });
  it("is never free when the manager sets no free-delivery amount", () => {
    expect(deliveryFee({ ...config, delivery: { ...config.delivery, freeFrom: null } }, 900000)).toBe(300);
  });
  it("falls back to the usual 250 / free from 30,000 while the ERP cannot be read", () => {
    expect(deliveryFee(DEFAULT_STORE_CONFIG, 10000)).toBe(250);
    expect(deliveryFee(DEFAULT_STORE_CONFIG, 30000)).toBe(0);
  });
});

describe("reading the ERP's configuration", () => {
  it("maps delivery, provinces and payment accounts", () => {
    const parsed = parseStoreConfig({
      delivery: { fee: "300.00", free_from: null, provinces: [{ province: "Sindh", fee: "500.00" }] },
      payment_methods: [{ method: "Cash on Delivery", accounts: [] }, { method: "Easypaisa", accounts: [{ title: "Trends", account_number: "03111234567", instructions: "Send a screenshot" }] }, { method: "Cheque", accounts: [] }],
    });
    expect(parsed?.delivery).toEqual({ fee: 300, freeFrom: null, provinces: [{ province: "Sindh", fee: 500 }] });
    expect(parsed?.paymentMethods.map((m) => m.method)).toEqual(["Cash on Delivery", "Easypaisa"]); // an unknown method is ignored
    expect(parsed?.paymentMethods[1].accounts[0]).toMatchObject({ accountNumber: "03111234567", instructions: "Send a screenshot" });
  });
  it("returns null for anything unexpected, so the caller falls back", () => {
    expect(parseStoreConfig(null)).toBeNull();
    expect(parseStoreConfig({ delivery: { fee: "x" }, payment_methods: [] })).toBeNull();
    expect(parseStoreConfig({ delivery: { fee: 1 } })).toBeNull();
  });
});

describe("the order sent to the ERP", () => {
  it("carries the province so the ERP prices delivery the same way", () => {
    const payload = buildOrderPayload({ ref: "TM-1", customer: { name: "Ali", phone: "+923001234567", line1: "House 1", city: "Karachi", province: "SINDH" }, lines: [], deliveryFee: 500, expectedTotal: 500 });
    expect(payload.customer.province).toBe("Sindh");
    expect(payload.delivery_fee).toBe("500.00");
  });
});
