import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_STORE_CONFIG, parseStoreConfig, type StoreConfig } from "@/lib/store-config";

/** Delivery pricing and payment accounts from the ERP (server side, with the order key). Refreshed at once when the ERP says something changed. */
export async function getStoreConfig(): Promise<StoreConfig> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");
  const url = process.env.ERP_API_URL?.replace(/\/+$/, "");
  const key = process.env.ERP_API_KEY;
  if (!url || !key) return DEFAULT_STORE_CONFIG;
  try {
    const response = await fetch(`${url}/api/online/config/`, { headers: { "X-API-Key": key }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return DEFAULT_STORE_CONFIG;
    return parseStoreConfig(await response.json()) ?? DEFAULT_STORE_CONFIG;
  } catch (e) {
    console.error("[erp-config] could not read the store settings", e);
    return DEFAULT_STORE_CONFIG;
  }
}
