import { describe, expect, it } from "vitest";
import { hmacSha512Hex, verifySignature } from "./signature";

const body = JSON.stringify({ type: "payment.succeeded", data: { tracker: "track_1", amount: 100 } });

describe("verifySignature", () => {
  it("accepts the correct HMAC-SHA512 hex signature, in any case", () => {
    const sig = hmacSha512Hex("secret", body);
    expect(verifySignature(body, sig, ["secret"])).toBe(true);
    expect(verifySignature(body, sig.toUpperCase(), ["secret"])).toBe(true);
  });

  it("rejects a tampered body, a wrong key or a missing signature", () => {
    const sig = hmacSha512Hex("secret", body);
    expect(verifySignature(body.replace("100", "1"), sig, ["secret"])).toBe(false);
    expect(verifySignature(body, sig, ["other"])).toBe(false);
    expect(verifySignature(body, null, ["secret"])).toBe(false);
    expect(verifySignature(body, "short", ["secret"])).toBe(false);
  });

  it("accepts the previous key during rotation, and ignores unset keys", () => {
    const sig = hmacSha512Hex("old", body);
    expect(verifySignature(body, sig, ["new", "old"])).toBe(true);
    expect(verifySignature(body, sig, [undefined, ""])).toBe(false);
  });
});
