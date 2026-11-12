import { describe, expect, it } from "vitest";
import { pgAdapterConfig } from "./pg-config";

describe("pgAdapterConfig", () => {
  it("passes the schema from the URL to the adapter and removes it from the connection string", () => {
    const { config, options } = pgAdapterConfig("postgresql://trendz_app.ref:p%40ss@host:5432/postgres?schema=trendz&sslmode=require");
    expect(options).toEqual({ schema: "trendz" });
    expect(config.connectionString).toBe("postgresql://trendz_app.ref:p%40ss@host:5432/postgres?sslmode=require");
  });

  it("leaves a URL without a schema alone", () => {
    const { config, options } = pgAdapterConfig("postgresql://macworld@localhost:5432/trendz_mobile");
    expect(options).toBeUndefined();
    expect(config.connectionString).toBe("postgresql://macworld@localhost:5432/trendz_mobile");
  });

  it("does not throw on a missing or unparsable value", () => {
    expect(pgAdapterConfig(undefined).options).toBeUndefined();
    expect(pgAdapterConfig("not a url").config.connectionString).toBe("not a url");
  });
});
