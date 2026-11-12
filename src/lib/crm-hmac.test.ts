import { describe, expect, it } from "vitest";
import { HMAC_MAX_SKEW_SECONDS, signCrmRequest, verifyCrmRequest } from "./crm-hmac";

const secret = "crm_sec_test_secret_123456";
const nowMs = 1_750_000_000_000;
const nowSec = Math.floor(nowMs / 1000);

describe("verifyCrmRequest", () => {
  it("accepts a valid HMAC-SHA256 signature for POST bodies and GET queries", () => {
    const body = JSON.stringify({ full: true, items: [] });
    const sig = signCrmRequest({
      secret,
      timestamp: nowSec,
      method: "POST",
      pathAndQuery: "/api/integrations/crm/stock",
      rawBody: body,
    });
    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: String(nowSec),
        signatureHeader: sig,
        method: "POST",
        pathAndQuery: "/api/integrations/crm/stock",
        rawBody: body,
        nowMs,
      }),
    ).toEqual({ ok: true });

    const getSig = signCrmRequest({
      secret,
      timestamp: nowSec,
      method: "GET",
      pathAndQuery: "/api/integrations/crm/orders?after=abc",
    });
    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: String(nowSec),
        signatureHeader: `sha256=${getSig.toUpperCase()}`,
        method: "get",
        pathAndQuery: "/api/integrations/crm/orders?after=abc",
        nowMs,
      }),
    ).toEqual({ ok: true });
  });

  it("rejects missing headers, tampered bodies, wrong secrets, and wrong paths", () => {
    const body = '{"items":[]}';
    const sig = signCrmRequest({
      secret,
      timestamp: nowSec,
      method: "POST",
      pathAndQuery: "/api/integrations/crm/stock",
      rawBody: body,
    });

    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: null,
        signatureHeader: sig,
        method: "POST",
        pathAndQuery: "/api/integrations/crm/stock",
        rawBody: body,
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "MISSING_SIGNATURE" });

    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: String(nowSec),
        signatureHeader: sig,
        method: "POST",
        pathAndQuery: "/api/integrations/crm/stock",
        rawBody: '{"items":[1]}',
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SIGNATURE" });

    expect(
      verifyCrmRequest({
        secret: "other_secret",
        timestampHeader: String(nowSec),
        signatureHeader: sig,
        method: "POST",
        pathAndQuery: "/api/integrations/crm/stock",
        rawBody: body,
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SIGNATURE" });

    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: String(nowSec),
        signatureHeader: sig,
        method: "POST",
        pathAndQuery: "/api/integrations/crm/orders/ack",
        rawBody: body,
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "INVALID_SIGNATURE" });
  });

  it("rejects stale or malformed timestamps to prevent replays", () => {
    const oldTs = nowSec - (HMAC_MAX_SKEW_SECONDS + 1);
    const sig = signCrmRequest({
      secret,
      timestamp: oldTs,
      method: "GET",
      pathAndQuery: "/api/integrations/crm/orders",
    });
    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: String(oldTs),
        signatureHeader: sig,
        method: "GET",
        pathAndQuery: "/api/integrations/crm/orders",
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "STALE_TIMESTAMP" });

    expect(
      verifyCrmRequest({
        secret,
        timestampHeader: "not-a-timestamp",
        signatureHeader: sig,
        method: "GET",
        pathAndQuery: "/api/integrations/crm/orders",
        nowMs,
      }),
    ).toMatchObject({ ok: false, code: "STALE_TIMESTAMP" });
  });
});

