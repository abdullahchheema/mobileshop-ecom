import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Read-only client for the ERP's public catalogue views (schema `api`, publishable key).
 * The ERP is the single source of truth for stock, prices, photos and orders: this storefront owns no data.
 * Only the seven `web_*` views are readable with this key; everything else in the ERP's database is private.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiClient = SupabaseClient<any, "api", "api", any, any>;
let client: ApiClient | null = null;

export class ErpConfigError extends Error {}

export function getSupabase(): ApiClient {
  if (client) return client;
  // SUPABASE_URL / SUPABASE_ANON_KEY are read when the server runs, so the ERP can be repointed without rebuilding.
  // NEXT_PUBLIC_* (the names in the ERP's guide) are baked into the build, so they only change with a new build.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ErpConfigError("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const created: ApiClient = createClient<any, "api">(url, key, {
    db: { schema: "api" }, // the views live in "api", not "public"
    auth: { persistSession: false, autoRefreshToken: false },
  });
  client = created;
  return created;
}
