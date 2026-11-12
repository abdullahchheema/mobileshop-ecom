import "server-only";
import { createHash } from "node:crypto";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { apiError } from "@/lib/api";
import { CRM_SIGNATURE_HEADER, CRM_TIMESTAMP_HEADER, verifyCrmRequest } from "@/lib/crm-hmac";
import { getErpAttentionCountsForSource, pendingByVariant } from "@/lib/crm-orders";
import { buildReconciliationReport, type SyncSummaryData } from "@/lib/crm-reconcile";
import { db } from "@/lib/db";
import {
  type AcceptedItem,
  applyPending,
  combineByVariant,
  groupKey,
  normalizeItems,
  type RejectedItem,
} from "@/lib/crm-stock";

/** Keys are created by scripts/crm-create-source.mts; only this hash is stored. */
export const hashApiKey = (key: string) => createHash("sha256").update(key).digest("hex");

export type SyncSource = { id: string; sellerId: string };
export type AuthenticatedSource = SyncSource & { createdAt: Date };

/**
 * Resolves `Authorization: Bearer crm_…` and, when `hmacSecret` is configured on the source,
 * verifies `X-Crm-Timestamp` and `X-Crm-Signature` against the method, path+query, and raw body.
 */
export async function requireCrmSource(request: Request, rawBody = ""): Promise<AuthenticatedSource | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (crm_[A-Za-z0-9_-]{20,})$/.exec(header);
  if (!match) return apiError(401, "UNAUTHENTICATED", "Missing, unknown or inactive integration key.");

  const source = await db.crmSource.findUnique({
    where: { apiKeyHash: hashApiKey(match[1]) },
    select: { id: true, sellerId: true, hmacSecret: true, createdAt: true, seller: { select: { status: true } } },
  });
  if (!source || source.seller.status !== "APPROVED") {
    return apiError(401, "UNAUTHENTICATED", "Missing, unknown or inactive integration key.");
  }

  if (source.hmacSecret) {
    const url = new URL(request.url);
    const sig = verifyCrmRequest({
      secret: source.hmacSecret,
      timestampHeader: request.headers.get(CRM_TIMESTAMP_HEADER),
      signatureHeader: request.headers.get(CRM_SIGNATURE_HEADER),
      method: request.method,
      pathAndQuery: url.pathname + url.search,
      rawBody,
    });
    if (!sig.ok) return apiError(401, sig.code, sig.message);
  }

  return { id: source.id, sellerId: source.sellerId, createdAt: source.createdAt };
}

/** Backwards-compatible wrapper returning null instead of a 401 Response. */
export async function authenticateSource(request: Request, rawBody = ""): Promise<AuthenticatedSource | null> {
  const result = await requireCrmSource(request, rawBody);
  return result instanceof Response ? null : result;
}

/** Reads the raw body once so HMAC verification and Zod JSON validation share the exact payload. */
export async function readSignedCrmJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ source: AuthenticatedSource; data: z.infer<T> } | Response> {
  const rawBody = await request.text();
  const source = await requireCrmSource(request, rawBody);
  if (source instanceof Response) return source;

  let body: unknown = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return apiError(400, "INVALID", "Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, "INVALID", parsed.error.issues[0]?.message ?? "Invalid request body.");
  return { source, data: parsed.data };
}

/**
 * Rebuilds the seller's offers from every mapped ERP group, so two groups sharing a
 * variant add up. `released` lists variants a group was just moved away from: if no
 * group maps to them any more, their offers are sold out. Returns how many offers were written.
 */
export async function rebuildOffers(tx: Prisma.TransactionClient, source: SyncSource, released: string[] = []) {
  const mapped = await tx.crmListingMap.findMany({ where: { sourceId: source.id, variantId: { not: null } } });
  const { createdAt } = await tx.crmSource.findUniqueOrThrow({ where: { id: source.id }, select: { createdAt: true } });
  const pending = await pendingByVariant(tx, { sellerId: source.sellerId, createdAt });
  const combined = applyPending(
    combineByVariant(
      mapped.map((m) => ({ variantId: m.variantId!, price: m.lastPrice, stock: m.lastStock, warrantyMonths: m.lastWarrantyMonths })),
    ),
    pending,
  );
  const variants = await tx.variant.findMany({
    where: { id: { in: combined.map((c) => c.variantId) } },
    select: { id: true, productId: true },
  });
  const productOf = new Map(variants.map((v) => [v.id, v.productId]));

  let written = 0;
  for (const c of combined) {
    const productId = productOf.get(c.variantId);
    if (!productId) continue;
    const fields = { price: c.price, stock: c.stock, warrantyMonths: c.warrantyMonths };
    await tx.offer.upsert({
      where: { sellerId_variantId: { sellerId: source.sellerId, variantId: c.variantId } },
      // An offer an admin paused stays paused; the sync only moves price, stock and warranty.
      update: fields,
      create: { ...fields, sellerId: source.sellerId, productId, variantId: c.variantId, status: "ACTIVE" },
    });
    written++;
  }

  const stillMapped = new Set(combined.map((c) => c.variantId));
  const orphaned = released.filter((id) => !stillMapped.has(id));
  if (orphaned.length > 0) {
    await tx.offer.updateMany({ where: { sellerId: source.sellerId, variantId: { in: orphaned } }, data: { stock: 0 } });
  }
  return written;
}

export type SyncResult = {
  received: number;
  accepted: number;
  rejected: RejectedItem[];
  unmapped: { productCode: string; condition: string; pta: string; productName: string; stock: number }[];
  offersUpdated: number;
  soldOut: number;
};

/**
 * Applies a stock snapshot from the ERP:
 *  1. remembers every valid group (mapped or not) with its latest price, stock and warranty;
 *  2. on a full snapshot, sets groups that vanished (or were rejected) to zero stock;
 *  3. rebuilds the seller's offers for every mapped variant from all of its groups.
 * Unmapped groups are stored for the admin to map but never listed.
 */
export async function applySnapshot(source: SyncSource, rawItems: unknown[], full: boolean): Promise<SyncResult> {
  const { accepted, rejected } = normalizeItems(rawItems);
  const incoming = new Map<string, AcceptedItem>(accepted.map((a) => [groupKey(a), a]));
  const now = new Date();

  return db.$transaction(
    async (tx) => {
      const existing = await tx.crmListingMap.findMany({ where: { sourceId: source.id } });
      const known = new Map(existing.map((m) => [groupKey({ productCode: m.crmProductCode, condition: m.crmCondition, pta: m.ptaStatus }), m]));

      for (const item of accepted) {
        const data = {
          crmProductName: item.productName,
          lastPrice: item.price,
          lastStock: item.stock,
          lastWarrantyMonths: item.warrantyMonths,
          lastSeenAt: now,
        };
        const found = known.get(groupKey(item));
        if (found) await tx.crmListingMap.update({ where: { id: found.id }, data });
        else
          await tx.crmListingMap.create({
            data: { ...data, sourceId: source.id, crmProductCode: item.productCode, crmCondition: item.condition, ptaStatus: item.pta },
          });
      }

      let soldOut = 0;
      if (full) {
        const gone = existing.filter((m) => !incoming.has(groupKey({ productCode: m.crmProductCode, condition: m.crmCondition, pta: m.ptaStatus })) && m.lastStock > 0);
        if (gone.length > 0) {
          await tx.crmListingMap.updateMany({ where: { id: { in: gone.map((m) => m.id) } }, data: { lastStock: 0 } });
          soldOut = gone.length;
        }
      }

      const offersUpdated = await rebuildOffers(tx, source);

      const unmapped = accepted
        .filter((a) => !known.get(groupKey(a))?.variantId)
        .map((a) => ({ productCode: a.productCode, condition: a.condition, pta: a.pta, productName: a.productName, stock: a.stock }));

      const rejectedItems = rejected.slice(0, 50).map((r) => ({
        ...(r.productCode !== undefined && { productCode: r.productCode }),
        ...(r.condition !== undefined && { condition: r.condition }),
        ...(r.pta !== undefined && { pta: r.pta }),
        reason: r.reason,
      }));
      const result: SyncResult = { received: rawItems.length, accepted: accepted.length, rejected, unmapped, offersUpdated, soldOut };
      await tx.crmSource.update({
        where: { id: source.id },
        data: {
          lastSyncAt: now,
          lastSyncSummary: {
            received: result.received,
            accepted: result.accepted,
            rejected: rejected.length,
            rejectedItems,
            unmapped: unmapped.length,
            offersUpdated,
            soldOut,
          },
        },
      });
      return result;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

const formatVariantLabel = (optionValues: { label: string; option: { position: number } }[]) =>
  [...optionValues].sort((a, b) => a.option.position - b.option.position).map((v) => v.label).join(" · ");

/** Builds a stock & price reconciliation report for one ERP source, optionally comparing a live ERP snapshot. */
export async function getReconciliationForSource(sourceId: string, liveErpItems?: AcceptedItem[]) {
  const source = await db.crmSource.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      name: true,
      sellerId: true,
      hmacSecret: true,
      lastSyncAt: true,
      lastSyncSummary: true,
      createdAt: true,
      seller: { select: { shopName: true, status: true, commissionBps: true } },
    },
  });
  if (!source) return null;

  const [listings, offers, pending, attention] = await Promise.all([
    db.crmListingMap.findMany({
      where: { sourceId: source.id },
      select: {
        id: true,
        crmProductCode: true,
        crmProductName: true,
        crmCondition: true,
        ptaStatus: true,
        lastPrice: true,
        lastStock: true,
        lastWarrantyMonths: true,
        lastSeenAt: true,
        variantId: true,
        variant: {
          select: {
            product: { select: { name: true } },
            optionValues: { select: { label: true, option: { select: { position: true } } } },
          },
        },
      },
    }),
    db.offer.findMany({
      where: { sellerId: source.sellerId },
      select: {
        id: true,
        variantId: true,
        price: true,
        stock: true,
        warrantyMonths: true,
        status: true,
        product: { select: { name: true } },
        variant: { select: { optionValues: { select: { label: true, option: { select: { position: true } } } } } },
      },
    }),
    pendingByVariant(db, { sellerId: source.sellerId, createdAt: source.createdAt }),
    getErpAttentionCountsForSource({ id: source.id, sellerId: source.sellerId, createdAt: source.createdAt }),
  ]);

  return buildReconciliationReport({
    source: {
      id: source.id,
      name: source.name,
      sellerId: source.sellerId,
      sellerShopName: source.seller.shopName,
      sellerStatus: source.seller.status,
      commissionBps: source.seller.commissionBps,
      hasHmac: Boolean(source.hmacSecret),
      lastSyncAt: source.lastSyncAt,
      lastSyncSummary: (source.lastSyncSummary as SyncSummaryData | null) ?? null,
    },
    listings: listings.map((l) => ({
      id: l.id,
      crmProductCode: l.crmProductCode,
      crmProductName: l.crmProductName,
      crmCondition: l.crmCondition,
      ptaStatus: l.ptaStatus,
      lastPrice: l.lastPrice,
      lastStock: l.lastStock,
      lastWarrantyMonths: l.lastWarrantyMonths,
      lastSeenAt: l.lastSeenAt,
      variantId: l.variantId,
      productName: l.variant?.product.name ?? null,
      variantLabel: l.variant ? formatVariantLabel(l.variant.optionValues) : null,
    })),
    offers: offers.map((o) => ({
      id: o.id,
      variantId: o.variantId,
      productName: o.product.name,
      variantLabel: formatVariantLabel(o.variant.optionValues),
      price: o.price,
      stock: o.stock,
      warrantyMonths: o.warrantyMonths,
      status: o.status,
    })),
    pendingByVariant: pending,
    attention,
    liveErpItems,
  });
}

/** Builds reconciliation reports for every connected ERP source. */
export async function getAllReconciliations() {
  const sources = await db.crmSource.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const reports = await Promise.all(sources.map((s) => getReconciliationForSource(s.id)));
  return reports.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Rebuilds Trendz offers for one ERP source from its stored group snapshots and
 * zeros out any orphaned offers that have no mapped ERP group left.
 */
export async function repairSourceOffers(sourceId: string) {
  return db.$transaction(async (tx) => {
    const source = await tx.crmSource.findUniqueOrThrow({
      where: { id: sourceId },
      select: { id: true, sellerId: true },
    });
    const [mapped, offers] = await Promise.all([
      tx.crmListingMap.findMany({ where: { sourceId: source.id, variantId: { not: null } }, select: { variantId: true } }),
      tx.offer.findMany({ where: { sellerId: source.sellerId, stock: { gt: 0 } }, select: { variantId: true } }),
    ]);
    const mappedSet = new Set(mapped.map((m) => m.variantId!));
    const orphaned = offers.map((o) => o.variantId).filter((id) => !mappedSet.has(id));
    const offersUpdated = await rebuildOffers(tx, source, orphaned);
    return { offersUpdated, soldOutOrphans: orphaned.length };
  });
}
