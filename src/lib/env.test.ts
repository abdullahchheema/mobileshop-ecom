import { describe, expect, it, vi } from "vitest";
import { missingEnv, validateEnv } from "./env";

const ok = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k", ERP_API_URL: "https://erp.test", ERP_API_KEY: "s" };

describe("environment check", () => {
  it("passes when everything is set, and accepts the runtime Supabase names", () => {
    expect(missingEnv(ok)).toEqual([]);
    expect(missingEnv({ ...ok, NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_URL: "https://y.supabase.co" })).toEqual([]);
  });
  it("throws in production, naming the variable but never a value", () => {
    expect(() => validateEnv({ ...ok, ERP_API_KEY: "" }, true)).toThrow(/ERP_API_KEY/);
    expect(() => validateEnv({ ...ok, ERP_API_KEY: "" }, true)).not.toThrow(/https:\/\/erp\.test/);
  });
  it("only warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateEnv({}, false)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it("refuses a secret exposed to the browser", () => {
    expect(() => validateEnv({ ...ok, NEXT_PUBLIC_ERP_API_KEY: "s" }, true)).toThrow(/NEXT_PUBLIC_ERP_API_KEY/);
  });
});
