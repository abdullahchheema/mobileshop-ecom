import "server-only";
import { rebuildOffers } from "@/lib/crm-sync";
import { db } from "@/lib/db";
import { ensureVariant } from "@/lib/variants";

export class MappingError extends Error {}

export const MAPPING_FILTERS = [
  { key: "unmapped", label: "Needs mapping" },
  { key: "mapped", label: "Mapped" },
  { key: "all", label: "All" },
] as const;
export type MappingFilter = (typeof MAPPING_FILTERS)[number]["key"];

const LIST_LIMIT = 300;

export async function getCrmOverview(filter: MappingFilter) {
  const sources = await db.crmSource.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      hmacSecret: true,
      lastSyncAt: true,
      lastSyncSummary: true,
      seller: { select: { shopName: true, status: true, commissionBps: true } },
    },
  });
  const [unmapped, mapped, listings] = await Promise.all([
    db.crmListingMap.count({ where: { variantId: null } }),
    db.crmListingMap.count({ where: { variantId: { not: null } } }),
    db.crmListingMap.findMany({
      where: filter === "all" ? {} : filter === "mapped" ? { variantId: { not: null } } : { variantId: null },
      orderBy: [{ lastStock: "desc" }, { crmProductName: "asc" }],
      take: LIST_LIMIT,
      select: {
        id: true,
        crmProductCode: true,
        crmProductName: true,
        crmCondition: true,
        ptaStatus: true,
        lastPrice: true,
        lastStock: true,
        lastSeenAt: true,
        variant: {
          select: {
            product: { select: { name: true } },
            optionValues: { select: { label: true, option: { select: { position: true } } } },
          },
        },
      },
    }),
  ]);
  return {
    sources: sources.map(({ hmacSecret, ...s }) => ({ ...s, hasHmac: Boolean(hmacSecret) })),
    counts: { unmapped, mapped, all: unmapped + mapped },
    truncated: listings.length === LIST_LIMIT,
    listings: listings.map(({ variant, ...l }) => ({
      ...l,
      mappedTo: variant
        ? {
            product: variant.product.name,
            label: [...variant.optionValues].sort((a, b) => a.option.position - b.option.position).map((v) => v.label).join(" · "),
          }
        : null,
    })),
  };
}

/** One ERP group with the variant it currently maps to (as chosen option value ids). */
export function getListingForMapping(id: string) {
  return db.crmListingMap.findUnique({
    where: { id },
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
      source: { select: { name: true } },
      variant: { select: { productId: true, optionValues: { select: { id: true } } } },
    },
  });
}

/** Product pickers (options with their values) for the mapping form. */
export function getMappingProducts() {
  return db.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, values: { orderBy: { position: "asc" }, select: { id: true, label: true } } },
      },
    },
  });
}

/** Points an ERP group at a variant (created if needed) and rebuilds the seller's offers. */
export async function mapListing(mapId: string, productId: string, valueIds: string[]) {
  const variant = await ensureVariant(productId, valueIds);
  await db.$transaction(async (tx) => {
    const row = await tx.crmListingMap.findUnique({
      where: { id: mapId },
      select: { variantId: true, sourceId: true, source: { select: { sellerId: true } } },
    });
    if (!row) throw new MappingError("That ERP group no longer exists.");
    await tx.crmListingMap.update({ where: { id: mapId }, data: { variantId: variant.id } });
    await rebuildOffers(tx, { id: row.sourceId, sellerId: row.source.sellerId }, row.variantId ? [row.variantId] : []);
  });
}

/** Stops listing an ERP group. Its old offer is sold out unless another group still feeds it. */
export async function unmapListing(mapId: string) {
  await db.$transaction(async (tx) => {
    const row = await tx.crmListingMap.findUnique({
      where: { id: mapId },
      select: { variantId: true, sourceId: true, source: { select: { sellerId: true } } },
    });
    if (!row) throw new MappingError("That ERP group no longer exists.");
    if (!row.variantId) return;
    await tx.crmListingMap.update({ where: { id: mapId }, data: { variantId: null } });
    await rebuildOffers(tx, { id: row.sourceId, sellerId: row.source.sellerId }, [row.variantId]);
  });
}
