import { beforeEach, describe, expect, it } from "vitest";
import { makeOrderRef, refMatchesPhone } from "./order-ref";

describe("order numbers with a phone check", () => {
  beforeEach(() => {
    process.env.ERP_API_KEY = "test-key";
  });
  const ref = () => makeOrderRef("ab12cd34ef56", "+923001234567");

  it("looks like TM-<id>-<check> and is stable", () => {
    expect(ref()).toMatch(/^TM-AB12CD34EF56-[A-Z0-9]{6}$/);
    expect(ref()).toBe(ref());
  });
  it("accepts the same phone however it is written", () => {
    for (const p of ["+923001234567", "0300 1234567", "0300-1234567", "+92 300 1234567"]) expect(refMatchesPhone(ref(), p)).toBe(true);
  });
  it("rejects another phone, a tampered number and junk", () => {
    expect(refMatchesPhone(ref(), "03009999999")).toBe(false);
    const last = ref().slice(-1);
    expect(refMatchesPhone(ref().slice(0, -1) + (last === "A" ? "B" : "A"), "03001234567")).toBe(false);
    expect(refMatchesPhone("TM-XYZ", "03001234567")).toBe(false);
    expect(refMatchesPhone(ref(), "123")).toBe(false);
  });
  it("depends on the secret", () => {
    const a = ref();
    process.env.ERP_API_KEY = "other";
    expect(refMatchesPhone(a, "03001234567")).toBe(false);
  });
});
