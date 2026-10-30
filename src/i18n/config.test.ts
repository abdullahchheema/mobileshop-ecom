import { describe, expect, it } from "vitest";
import { isStorefrontPath, localizePath, stripLang } from "./config";

describe("localizePath", () => {
  it("leaves English unprefixed and prefixes Urdu", () => {
    expect(localizePath("/cart", "en")).toBe("/cart");
    expect(localizePath("/cart", "ur")).toBe("/ur/cart");
    expect(localizePath("/", "ur")).toBe("/ur");
    expect(localizePath("/l/iphone?sort=price-asc", "ur")).toBe("/ur/l/iphone?sort=price-asc");
    expect(localizePath("/?q=x", "ur")).toBe("/ur?q=x");
  });

  it("switches languages without doubling prefixes", () => {
    expect(localizePath("/ur/cart", "en")).toBe("/cart");
    expect(localizePath("/ur/cart", "ur")).toBe("/ur/cart");
    expect(localizePath("/en/cart", "ur")).toBe("/ur/cart");
  });

  it("never prefixes the seller hub, admin or API", () => {
    expect(localizePath("/seller/orders", "ur")).toBe("/seller/orders");
    expect(localizePath("/admin", "ur")).toBe("/admin");
    expect(localizePath("/api/v1/cart", "ur")).toBe("/api/v1/cart");
    expect(localizePath("/sell", "ur")).toBe("/ur/sell");
  });

  it("leaves external and protocol-relative links alone", () => {
    expect(localizePath("https://example.com", "ur")).toBe("https://example.com");
    expect(localizePath("//evil.example", "ur")).toBe("//evil.example");
  });
});

describe("stripLang", () => {
  it("only strips whole segments", () => {
    expect(stripLang("/ur")).toBe("/");
    expect(stripLang("/ur/p/x")).toBe("/p/x");
    expect(stripLang("/urdu-books")).toBe("/urdu-books");
  });
});

describe("isStorefrontPath", () => {
  it("excludes the API, consoles and files", () => {
    expect(isStorefrontPath("/p/iphone-14")).toBe(true);
    expect(isStorefrontPath("/")).toBe(true);
    expect(isStorefrontPath("/seller/orders")).toBe(false);
    expect(isStorefrontPath("/api/v1/cart")).toBe(false);
    expect(isStorefrontPath("/favicon.ico")).toBe(false);
    expect(isStorefrontPath("/sell")).toBe(true);
  });
});
