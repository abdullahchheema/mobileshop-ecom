import "server-only";
import { Pool } from "pg";
import { applySnapshot, type SyncResult, type SyncSource } from "@/lib/crm-sync";
import { db } from "@/lib/db";
import { type OnlineStockRow, rowsToSnapshotItems } from "@/lib/erp-stock-rows";

/**
 * Reads what the ERP has for sale straight from its database view, instead of waiting for the
 * ERP to POST a snapshot. In production both apps live in one Supabase Postgres, and this
 * connects as a role that can only SELECT the view. The ERP stays the source of truth for stock.
 */
const globalForPool = globalThis as unknown as { erpStockPool?: Pool };

function pool() {
  const url = process.env.ERP_STOCK_DATABASE_URL;
  if (!url) throw new ErpStockError("ERP_STOCK_DATABASE_URL is not set.");
  globalForPool.erpStockPool ??= new Pool({ connectionString: url, max: 2, idleTimeoutMillis: 30_000 });
  return globalForPool.erpStockPool;
}

export class ErpStockError extends Error {}

/** `schema.view` names only; the value comes from the environment, never from a request. */
function viewName() {
  const name = process.env.ERP_STOCK_VIEW ?? "covison_app.online_stock";
  if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/i.test(name)) throw new ErpStockError("ERP_STOCK_VIEW is not a valid view name.");
  return name;
}

function warrantyOverride() {
  const raw = process.env.ERP_ONLINE_WARRANTY_DAYS?.trim();
  if (!raw) return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 0) throw new ErpStockError("ERP_ONLINE_WARRANTY_DAYS must be a whole number of days.");
  return days;
}

export async function readOnlineStock(): Promise<OnlineStockRow[]> {
  try {
    const result = await pool().query<OnlineStockRow>(
      `select product_code, product_name, condition, pta_status, price, stock, warranty_days from ${viewName()} order by product_code, condition, pta_status`,
    );
    return result.rows;
  } catch (e) {
    if (e instanceof ErpStockError) throw e;
    // Connection or permission trouble: report it as "ERP unavailable" and keep the current listings untouched.
    console.error("[erp-stock] could not read the ERP stock view", e);
    throw new ErpStockError("The ERP stock view could not be read. Listings were left as they are.");
  }
}

/** Re-reads the ERP view and rebuilds this source's offers (a full snapshot: groups that vanished sell out). */
export async function refreshFromErp(source: SyncSource): Promise<SyncResult> {
  const rows = await readOnlineStock();
  return applySnapshot(source, rowsToSnapshotItems(rows, warrantyOverride()), true);
}

/** Every integration source, for the scheduled safety-net refresh. */
export function listSources(): Promise<SyncSource[]> {
  return db.crmSource.findMany({ where: { seller: { status: "APPROVED" } }, select: { id: true, sellerId: true } });
}
