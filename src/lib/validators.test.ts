import { describe, expect, it } from "vitest";
import { addressSchema, cnicSchema, ibanSchema } from "./validators";

describe("cnicSchema", () => {
  it("normalises any 13-digit input to the dashed format", () => {
    expect(cnicSchema.parse("3520212345671")).toBe("35202-1234567-1");
    expect(cnicSchema.parse("35202-1234567-1")).toBe("35202-1234567-1");
  });
  it("rejects the wrong length", () => {
    expect(cnicSchema.safeParse("35202-123456-1").success).toBe(false);
  });
});

describe("ibanSchema", () => {
  it("accepts a Pakistani IBAN with spaces and lowercase", () => {
    expect(ibanSchema.parse("pk36 scbl 0000 0011 2345 6702")).toBe("PK36SCBL0000001123456702");
  });
  it("rejects other formats", () => {
    expect(ibanSchema.safeParse("GB29NWBK60161331926819").success).toBe(false);
    expect(ibanSchema.safeParse("PK36SCBL000000112345670").success).toBe(false);
  });
});

describe("addressSchema", () => {
  it("normalises the phone and drops empty optionals", () => {
    const parsed = addressSchema.parse({
      fullName: "Ayesha Khan",
      phone: "0300 1234567",
      line1: "House 12, Street 4",
      line2: "",
      city: "Lahore",
      province: "PUNJAB",
      postalCode: "",
    });
    expect(parsed.phone).toBe("+923001234567");
    expect(parsed.line2).toBeUndefined();
    expect(parsed.postalCode).toBeUndefined();
  });
});
