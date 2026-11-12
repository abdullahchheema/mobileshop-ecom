// Smoke-tests the Trendz ↔ Covison ERP API (auth, HMAC signing, orders, updates, reconciliation).
//   CRM_API_KEY=crm_… CRM_HMAC_SECRET=crm_sec_… npx tsx scripts/crm-smoke-test.mts [--write]
// Read-only by default; pass --write on dev/staging to also send a non-destructive (full: false) stock test item.
import assert from "node:assert/strict";
import { CRM_SIGNATURE_HEADER, CRM_TIMESTAMP_HEADER, signCrmRequest } from "../src/lib/crm-hmac";

const baseUrl = (process.env.TRENDZ_URL ?? "http://localhost:3000").replace(/\/$/, "");
const apiKey = process.env.CRM_API_KEY;
const hmacSecret = process.env.CRM_HMAC_SECRET;
const allowWrite = process.argv.includes("--write");

if (!apiKey) {
  console.error("Missing CRM_API_KEY. Usage: CRM_API_KEY=crm_… [CRM_HMAC_SECRET=crm_sec_…] npx tsx scripts/crm-smoke-test.mts [--write]");
  process.exit(1);
}

type CallOpts = {
  method: "GET" | "POST";
  path: string;
  body?: string;
  auth?: string | null;
  secret?: string | null;
  timestamp?: number;
  overrideSignature?: string;
};

async function callApi({ method, path, body, auth = `Bearer ${apiKey}`, secret = hmacSecret ?? null, timestamp, overrideSignature }: CallOpts) {
  const headers: Record<string, string> = {};
  if (auth) headers.authorization = auth;
  if (body !== undefined) headers["content-type"] = "application/json";
  if (secret) {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    headers[CRM_TIMESTAMP_HEADER] = String(ts);
    headers[CRM_SIGNATURE_HEADER] =
      overrideSignature ?? signCrmRequest({ secret, timestamp: ts, method, pathAndQuery: path, rawBody: body ?? "" });
  }
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function step(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`✓ ${name}`);
}

await step("rejects unauthenticated request (401)", async () => {
  const res = await callApi({ method: "GET", path: "/api/integrations/crm/orders", auth: null, secret: null });
  assert.equal(res.status, 401);
});

if (hmacSecret) {
  await step("rejects missing HMAC headers when HMAC is enabled", async () => {
    const res = await callApi({ method: "GET", path: "/api/integrations/crm/orders", secret: null });
    assert.equal(res.status, 401);
    assert.equal(res.json?.error?.code, "MISSING_SIGNATURE");
  });

  await step("rejects stale timestamp outside 300s window", async () => {
    const stale = Math.floor(Date.now() / 1000) - 600;
    const res = await callApi({ method: "GET", path: "/api/integrations/crm/orders", timestamp: stale });
    assert.equal(res.status, 401);
    assert.equal(res.json?.error?.code, "STALE_TIMESTAMP");
  });

  await step("rejects tampered signature on GET", async () => {
    const res = await callApi({
      method: "GET",
      path: "/api/integrations/crm/orders",
      overrideSignature: "0".repeat(64),
    });
    assert.equal(res.status, 401);
    assert.equal(res.json?.error?.code, "INVALID_SIGNATURE");
  });

  await step("rejects tampered POST body after signing", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const sig = signCrmRequest({
      secret: hmacSecret,
      timestamp: ts,
      method: "POST",
      pathAndQuery: "/api/integrations/crm/reconciliation",
      rawBody: JSON.stringify({ full: false, items: [] }),
    });
    const res = await callApi({
      method: "POST",
      path: "/api/integrations/crm/reconciliation",
      body: JSON.stringify({ full: true, items: [] }),
      timestamp: ts,
      overrideSignature: sig,
    });
    assert.equal(res.status, 401);
    assert.equal(res.json?.error?.code, "INVALID_SIGNATURE");
  });
}

await step("GET /api/integrations/crm/orders", async () => {
  const res = await callApi({ method: "GET", path: "/api/integrations/crm/orders" });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json?.orders));
});

await step("GET /api/integrations/crm/orders/updates", async () => {
  const res = await callApi({ method: "GET", path: "/api/integrations/crm/orders/updates" });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json?.collections));
  assert.ok(Array.isArray(res.json?.cancellations));
  assert.ok(Array.isArray(res.json?.returns));
});

await step("GET /api/integrations/crm/reconciliation", async () => {
  const res = await callApi({ method: "GET", path: "/api/integrations/crm/reconciliation" });
  assert.equal(res.status, 200);
  assert.ok(typeof res.json?.summary?.totalGroups === "number");
  assert.ok(Array.isArray(res.json?.alerts));
});

await step("POST /api/integrations/crm/reconciliation (read-only live diff)", async () => {
  const body = JSON.stringify({
    full: false,
    items: [
      {
        productCode: "SMOKE-PROBE-1",
        productName: "Smoke Probe Phone",
        condition: "Good",
        pta: "PTA",
        price: "50000.00",
        stock: 1,
        warrantyDays: 365,
      },
    ],
  });
  const res = await callApi({ method: "POST", path: "/api/integrations/crm/reconciliation", body });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.json?.missingInTrendz));
});

if (allowWrite) {
  await step("POST /api/integrations/crm/stock (full: false partial snapshot)", async () => {
    const body = JSON.stringify({
      full: false,
      items: [
        {
          productCode: "SMOKE-TEST-VALID",
          productName: "iPhone 14 128GB Black (Smoke Test)",
          condition: "Good",
          pta: "PTA",
          price: "125000.00",
          stock: 0,
          warrantyDays: 365,
        },
        {
          productCode: "SMOKE-TEST-SHORT-WARRANTY",
          productName: "Short Warranty Probe",
          condition: "Good",
          pta: "PTA",
          price: "90000.00",
          stock: 1,
          warrantyDays: 90,
        },
      ],
    });
    const res = await callApi({ method: "POST", path: "/api/integrations/crm/stock", body });
    assert.equal(res.status, 200);
    assert.equal(res.json?.accepted, 1);
    assert.equal(res.json?.rejected?.length, 1);
  });
}

console.log(`\nAll CRM smoke checks passed against ${baseUrl}${allowWrite ? " (with --write)" : " (read-only)"}.`);

