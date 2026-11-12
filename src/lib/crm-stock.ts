import { z } from "zod";

// Pure rules for turning an ERP stock snapshot into Trendz listings. No database
// access here, so the rules can be unit-tested; crm-sync.ts applies the result.

export const PRICE_MIN = 1_000;
export const PRICE_MAX = 5_000_000;
export const STOCK_MAX = 999;
export const WARRANTY_MIN_MONTHS = 12;
export const WARRANTY_MAX_MONTHS = 36;
export const SNAPSHOT_MAX_ITEMS = 5_000;

const text = (max: number) => z.string().trim().max(max);

/** One stock group as the ERP sends it. Numbers may arrive as strings (Django decimals). */
export const snapshotItemSchema = z.object({
  productCode: text(180).min(1, "productCode is required"),
  productName: text(300).min(1, "productName is required"),
  condition: text(60).default(""),
  pta: text(30).default(""),
  price: z.union([z.number(), z.string()]),
  stock: z.union([z.number(), z.string()]),
  warrantyDays: z.union([z.number(), z.string()]).default(0),
});

export const snapshotSchema = z.object({
  /** A full snapshot also sells out any group that is no longer in the list. */
  full: z.boolean().default(true),
  items: z.array(z.unknown()).max(SNAPSHOT_MAX_ITEMS, `At most ${SNAPSHOT_MAX_ITEMS} groups per snapshot`),
});

export type GroupKey = { productCode: string; condition: string; pta: string };
export type AcceptedItem = GroupKey & {
  productName: string;
  price: number;
  stock: number;
  warrantyMonths: number;
};
export type RejectedItem = Partial<GroupKey> & { reason: string };

export const groupKey = (g: GroupKey) => [g.productCode, g.condition, g.pta].join("\u0000");

const toNumber = (v: number | string) => (typeof v === "number" ? v : v.trim() === "" ? NaN : Number(v));

/** Validates every item on its own, so one bad row never blocks the rest of the snapshot. */
export function normalizeItems(items: unknown[]): { accepted: AcceptedItem[]; rejected: RejectedItem[] } {
  const accepted: AcceptedItem[] = [];
  const rejected: RejectedItem[] = [];
  const seen = new Set<string>();

  for (const raw of items) {
    const parsed = snapshotItemSchema.safeParse(raw);
    if (!parsed.success) {
      const r = raw as Partial<Record<string, unknown>> | null;
      rejected.push({
        productCode: typeof r?.productCode === "string" ? r.productCode : undefined,
        reason: parsed.error.issues[0]?.message ?? "Invalid item.",
      });
      continue;
    }
    const item = parsed.data;
    const key: GroupKey = {
      productCode: item.productCode,
      condition: item.condition || "Not recorded",
      pta: item.pta || "Not recorded",
    };
    const reject = (reason: string) => rejected.push({ ...key, reason });

    if (seen.has(groupKey(key))) {
      reject("Duplicate group in this snapshot.");
      continue;
    }
    seen.add(groupKey(key));

    const rawPrice = toNumber(item.price);
    if (!Number.isFinite(rawPrice)) {
      reject("Price is not a number.");
      continue;
    }
    const price = Math.round(rawPrice);
    if (price < PRICE_MIN || price > PRICE_MAX) {
      reject(`Price Rs ${price.toLocaleString("en-PK")} is outside Rs ${PRICE_MIN.toLocaleString("en-PK")} – ${PRICE_MAX.toLocaleString("en-PK")}.`);
      continue;
    }

    const rawStock = toNumber(item.stock);
    if (!Number.isInteger(rawStock) || rawStock < 0) {
      reject("Stock must be a whole number, zero or more.");
      continue;
    }

    const days = toNumber(item.warrantyDays);
    if (!Number.isFinite(days) || days < 0) {
      reject("Warranty days must be a number, zero or more.");
      continue;
    }
    const months = Math.round(days / 30);
    if (months < WARRANTY_MIN_MONTHS) {
      reject(`Warranty of ${days} days is below the ${WARRANTY_MIN_MONTHS}-month minimum Trendz requires.`);
      continue;
    }

    accepted.push({
      ...key,
      productName: item.productName,
      price,
      stock: Math.min(rawStock, STOCK_MAX),
      warrantyMonths: Math.min(months, WARRANTY_MAX_MONTHS),
    });
  }
  return { accepted, rejected };
}

const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/**
 * Guesses which catalog product an ERP stock group is: the product whose whole
 * name appears in the ERP name, preferring the longest ("iPhone 16 Pro Max" over
 * "iPhone 16 Pro"). Only a suggestion for the admin, never applied automatically.
 */
export function suggestProductId(erpName: string, products: { id: string; name: string }[]) {
  const words = new Set(tokens(erpName));
  let best: { id: string; size: number } | null = null;
  for (const p of products) {
    const t = tokens(p.name);
    if (t.length > 0 && t.every((w) => words.has(w)) && (!best || t.length > best.size)) best = { id: p.id, size: t.length };
  }
  return best?.id ?? null;
}

/**
 * Stock still free after orders the ERP has not booked yet. Without this, a snapshot taken
 * before the ERP booked a phone would put that phone back on sale.
 */
export function applyPending<T extends { variantId: string; stock: number }>(rows: T[], pending: Map<string, number>): T[] {
  return rows.map((r) => ({ ...r, stock: Math.max(0, r.stock - (pending.get(r.variantId) ?? 0)) }));
}

/** The ERP's answer to an order: booked (with its document codes) or not fulfillable (with a reason). */
export const ackSchema = z.object({
  results: z
    .array(
      z.discriminatedUnion("status", [
        z.object({
          sellerOrderId: z.string().min(1),
          status: z.literal("BOOKED"),
          documents: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
        }),
        z.object({
          sellerOrderId: z.string().min(1),
          status: z.literal("FAILED"),
          reason: z.string().trim().min(1).max(500),
        }),
      ]),
    )
    .min(1)
    .max(100),
});

/** The ERP reporting what it applied to orders it had already booked. */
export const updatesAckSchema = z.object({
  results: z
    .array(
      z.object({
        kind: z.enum(["COLLECTED", "REVERSED", "RETURNED"]),
        id: z.string().min(1),
        documents: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
      }),
    )
    .min(1)
    .max(150),
});

type MappedGroup ={ variantId: string; price: number; stock: number; warrantyMonths: number };

/**
 * Several ERP groups can map to one Trendz variant. The offer then shows the
 * summed stock, the cheapest price and the shortest warranty among groups that
 * actually have stock (or among all of them when nothing is in stock).
 */
export function combineByVariant(groups: MappedGroup[]) {
  const byVariant = new Map<string, MappedGroup[]>();
  for (const g of groups) byVariant.set(g.variantId, [...(byVariant.get(g.variantId) ?? []), g]);

  return [...byVariant.entries()].map(([variantId, list]) => {
    const live = list.filter((g) => g.stock > 0);
    const basis = live.length > 0 ? live : list;
    return {
      variantId,
      stock: Math.min(
        list.reduce((sum, g) => sum + g.stock, 0),
        STOCK_MAX,
      ),
      price: Math.min(...basis.map((g) => g.price)),
      warrantyMonths: Math.min(...basis.map((g) => g.warrantyMonths)),
    };
  });
}
