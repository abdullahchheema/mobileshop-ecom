import { createHmac, timingSafeEqual } from "node:crypto";

export const CRM_TIMESTAMP_HEADER = "x-crm-timestamp";
export const CRM_SIGNATURE_HEADER = "x-crm-signature";
export const HMAC_MAX_SKEW_SECONDS = 300;

export type SignInput = {
  secret: string;
  timestamp: number | string;
  method: string;
  pathAndQuery: string;
  rawBody?: string;
};

/** Canonical payload signed by the ERP: `<unix-seconds>.<METHOD>.<path+query>.<raw-body>`. */
export function buildCrmSigningString({ timestamp, method, pathAndQuery, rawBody = "" }: Omit<SignInput, "secret">) {
  return `${timestamp}.${method.toUpperCase()}.${pathAndQuery}.${rawBody}`;
}

/** Computes the lowercase hex HMAC-SHA256 signature for an ERP request. */
export function signCrmRequest(input: SignInput): string {
  return createHmac("sha256", input.secret).update(buildCrmSigningString(input)).digest("hex");
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; code: "MISSING_SIGNATURE" | "STALE_TIMESTAMP" | "INVALID_SIGNATURE"; message: string };

/**
 * Verifies `X-Crm-Timestamp` (replay window) and `X-Crm-Signature` (constant-time HMAC-SHA256).
 * Accepts either bare hex or `sha256=<hex>`.
 */
export function verifyCrmRequest({
  secret,
  timestampHeader,
  signatureHeader,
  method,
  pathAndQuery,
  rawBody = "",
  nowMs = Date.now(),
}: {
  secret: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  method: string;
  pathAndQuery: string;
  rawBody?: string;
  nowMs?: number;
}): VerifyResult {
  if (!timestampHeader || !signatureHeader) {
    return {
      ok: false,
      code: "MISSING_SIGNATURE",
      message: "Missing X-Crm-Timestamp or X-Crm-Signature header.",
    };
  }

  const trimmedTs = timestampHeader.trim();
  if (!/^\d+$/.test(trimmedTs)) {
    return { ok: false, code: "STALE_TIMESTAMP", message: "Invalid X-Crm-Timestamp header." };
  }
  const ts = Number(trimmedTs);
  const nowSeconds = Math.floor(nowMs / 1000);
  if (!Number.isSafeInteger(ts) || Math.abs(nowSeconds - ts) > HMAC_MAX_SKEW_SECONDS) {
    return {
      ok: false,
      code: "STALE_TIMESTAMP",
      message: `Request timestamp is outside the ${HMAC_MAX_SKEW_SECONDS}s window.`,
    };
  }

  const rawSig = signatureHeader.trim().toLowerCase();
  const hexSig = rawSig.startsWith("sha256=") ? rawSig.slice(7) : rawSig;
  if (!/^[0-9a-f]{64}$/.test(hexSig)) {
    return { ok: false, code: "INVALID_SIGNATURE", message: "Invalid X-Crm-Signature format." };
  }

  const expected = Buffer.from(signCrmRequest({ secret, timestamp: ts, method, pathAndQuery, rawBody }), "hex");
  const received = Buffer.from(hexSig, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, code: "INVALID_SIGNATURE", message: "Invalid X-Crm-Signature." };
  }

  return { ok: true };
}

