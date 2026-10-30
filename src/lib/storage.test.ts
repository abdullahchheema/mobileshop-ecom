import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sniffImageType } = await import("./storage");

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("sniffImageType", () => {
  it("recognises JPEG, PNG and WebP by their signatures", () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpg");
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a))).toBe("png");
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBP"))).toBe("webp");
  });

  it("rejects anything else, whatever the file is called", () => {
    expect(sniffImageType(bytes("<svg xmlns"))).toBeNull();
    expect(sniffImageType(bytes("GIF89a"))).toBeNull();
    expect(sniffImageType(bytes("#!/bin/sh"))).toBeNull();
  });
});
