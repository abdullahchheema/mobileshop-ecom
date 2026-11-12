import { type AcceptedItem, combineByVariant, groupKey, type RejectedItem, STOCK_MAX } from "./crm-stock";

export const SYNC_STALE_WARNING_MINUTES = 60;
export const SYNC_STALE_CRITICAL_MINUTES = 180;

export type SyncRejectedItem = RejectedItem;

export type SyncSummaryData = {
  received?: number;
  accepted?: number;
  rejected?: number;
  rejectedItems?: SyncRejectedItem[];
  unmapped?: number;
  offersUpdated?: number;
  soldOut?: number;
};

export type ReconcileSourceInput = {
  id: string;
  name: string;
  sellerId: string;
  sellerShopName: string;
  sellerStatus: string;
  commissionBps: number;
  hasHmac: boolean;
  lastSyncAt: Date | null;
  lastSyncSummary: SyncSummaryData | null;
};

export type ReconcileListingRow = {
  id: string;
  crmProductCode: string;
  crmProductName: string;
  crmCondition: string;
  ptaStatus: string;
  lastPrice: number;
  lastStock: number;
  lastWarrantyMonths: number;
  lastSeenAt: Date;
  variantId: string | null;
  productName: string | null;
  variantLabel: string | null;
};

export type ReconcileOfferRow = {
  id: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  stock: number;
  warrantyMonths: number;
  status: "DRAFT" | "ACTIVE" | "PAUSED";
};

export type ReconcileAlert = {
  severity: "critical" | "warning";
  code: string;
  title: string;
  detail: string;
  variantId?: string;
  groupId?: string;
};

export type VariantIssue =
  | "STOCK_MISMATCH"
  | "PRICE_MISMATCH"
  | "WARRANTY_MISMATCH"
  | "OFFER_MISSING"
  | "ORPHANED_OFFER"
  | "PAUSED"
  | "DEFICIT";

export type VariantReconciliation = {
  variantId: string;
  productName: string;
  variantLabel: string;
  groupCount: number;
  erpStock: number;
  pendingUnits: number;
  expectedStock: number;
  actualStock: number | null;
  expectedPrice: number | null;
  actualPrice: number | null;
  expectedWarrantyMonths: number | null;
  actualWarrantyMonths: number | null;
  offerStatus: ReconcileOfferRow["status"] | null;
  issues: VariantIssue[];
};

export type GroupStatus =
  | "OK"
  | "UNMAPPED"
  | "STOCK_MISMATCH"
  | "PRICE_MISMATCH"
  | "OFFER_MISSING"
  | "PAUSED"
  | "DEFICIT"
  | "STALE"
  | "LIVE_ERP_DRIFT"
  | "MISSING_IN_ERP";

export type GroupReconciliation = {
  id: string;
  productCode: string;
  productName: string;
  condition: string;
  pta: string;
  erpStock: number;
  erpPrice: number;
  erpWarrantyMonths: number;
  lastSeenAt: string;
  variantId: string | null;
  mappedProduct: string | null;
  mappedLabel: string | null;
  groupCountSharingVariant: number;
  pendingUnits: number;
  expectedVariantStock: number | null;
  offerStock: number | null;
  offerPrice: number | null;
  offerStatus: ReconcileOfferRow["status"] | null;
  liveErpStock?: number | null;
  liveErpPrice?: number | null;
  status: GroupStatus;
};

export type ReconciliationReport = {
  generatedAt: string;
  source: {
    id: string;
    name: string;
    sellerShopName: string;
    sellerStatus: string;
    hasHmac: boolean;
    lastSyncAt: string | null;
  };
  summary: {
    totalGroups: number;
    mappedGroups: number;
    unmappedGroups: number;
    unmappedWithStock: number;
    erpMappedUnits: number;
    erpUnmappedUnits: number;
    pendingUnits: number;
    expectedOfferUnits: number;
    actualOfferUnits: number;
    mismatchedVariants: number;
    orphanedOffers: number;
    pausedWithStock: number;
    deficits: number;
    staleGroups: number;
    liveErpDrifts: number;
    missingInTrendz: number;
    criticalAlerts: number;
    warningAlerts: number;
  };
  alerts: ReconcileAlert[];
  variants: VariantReconciliation[];
  groups: GroupReconciliation[];
  missingInTrendz: AcceptedItem[];
  rejectedInLastSync: SyncRejectedItem[];
};

/**
 * Computes a complete ERP ↔ Trendz reconciliation report and mismatch alerts
 * from the stored ERP group snapshots, Trendz live offers, unacknowledged orders,
 * and an optional live ERP snapshot for read-only comparison.
 */
export function buildReconciliationReport({
  source,
  listings,
  offers,
  pendingByVariant,
  attention = { failedCount: 0, stuckCount: 0, waitingCount: 0 },
  liveErpItems,
  now = new Date(),
}: {
  source: ReconcileSourceInput;
  listings: ReconcileListingRow[];
  offers: ReconcileOfferRow[];
  pendingByVariant: Map<string, number>;
  attention?: { failedCount: number; stuckCount: number; waitingCount: number };
  liveErpItems?: AcceptedItem[];
  now?: Date;
}): ReconciliationReport {
  const alerts: ReconcileAlert[] = [];
  const offersByVariant = new Map(offers.map((o) => [o.variantId, o]));
  const mappedByVariant = new Map<string, ReconcileListingRow[]>();
  for (const row of listings) {
    if (!row.variantId) continue;
    mappedByVariant.set(row.variantId, [...(mappedByVariant.get(row.variantId) ?? []), row]);
  }

  const combined = combineByVariant(
    listings
      .filter((l) => l.variantId !== null)
      .map((l) => ({
        variantId: l.variantId!,
        price: l.lastPrice,
        stock: l.lastStock,
        warrantyMonths: l.lastWarrantyMonths,
      })),
  );
  const combinedByVariant = new Map(combined.map((c) => [c.variantId, c]));

  const variants: VariantReconciliation[] = [];
  const variantIssuesMap = new Map<string, VariantIssue[]>();
  const variantExpectedMap = new Map<string, { erpStock: number; pendingUnits: number; expectedStock: number }>();

  let erpMappedUnits = 0;
  let pendingUnitsTotal = 0;
  let expectedOfferUnits = 0;
  let actualOfferUnits = 0;
  let mismatchedVariants = 0;
  let orphanedOffers = 0;
  let pausedWithStock = 0;
  let deficits = 0;

  for (const [variantId, groupRows] of mappedByVariant.entries()) {
    const rawErpStock = groupRows.reduce((sum, g) => sum + g.lastStock, 0);
    const pendingUnits = pendingByVariant.get(variantId) ?? 0;
    const expectedStock = Math.min(STOCK_MAX, Math.max(0, rawErpStock - pendingUnits));
    const expected = combinedByVariant.get(variantId)!;
    const offer = offersByVariant.get(variantId) ?? null;

    erpMappedUnits += rawErpStock;
    pendingUnitsTotal += pendingUnits;
    expectedOfferUnits += expectedStock;
    if (offer) actualOfferUnits += offer.stock;

    const productName = offer?.productName ?? groupRows[0].productName ?? groupRows[0].crmProductName;
    const variantLabel = offer?.variantLabel ?? groupRows[0].variantLabel ?? variantId;
    const issues: VariantIssue[] = [];

    if (pendingUnits > rawErpStock) {
      issues.push("DEFICIT");
      deficits++;
      alerts.push({
        severity: "critical",
        code: "RESERVATION_DEFICIT",
        title: `Oversell risk on ${productName} (${variantLabel})`,
        detail: `${pendingUnits} unacknowledged online unit(s) exceed ${rawErpStock} ERP unit(s).`,
        variantId,
      });
    }

    if (!offer) {
      issues.push("OFFER_MISSING");
      alerts.push({
        severity: "critical",
        code: "OFFER_MISSING",
        title: `Missing Trendz offer for ${productName} (${variantLabel})`,
        detail: `${groupRows.length} ERP group(s) are mapped here (${expectedStock} expected units), but no Trendz offer row exists.`,
        variantId,
      });
    } else {
      if (offer.stock !== expectedStock) {
        issues.push("STOCK_MISMATCH");
        alerts.push({
          severity: "critical",
          code: "OFFER_STOCK_MISMATCH",
          title: `Stock mismatch on ${productName} (${variantLabel})`,
          detail: `Trendz offer shows ${offer.stock}, expected ${expectedStock} (${rawErpStock} ERP − ${pendingUnits} pending).`,
          variantId,
        });
      }
      if (offer.price !== expected.price) {
        issues.push("PRICE_MISMATCH");
        alerts.push({
          severity: "warning",
          code: "OFFER_PRICE_MISMATCH",
          title: `Price mismatch on ${productName} (${variantLabel})`,
          detail: `Trendz offer price is Rs ${offer.price.toLocaleString("en-PK")}, expected Rs ${expected.price.toLocaleString("en-PK")}.`,
          variantId,
        });
      }
      if (offer.warrantyMonths !== expected.warrantyMonths) {
        issues.push("WARRANTY_MISMATCH");
        alerts.push({
          severity: "warning",
          code: "OFFER_WARRANTY_MISMATCH",
          title: `Warranty mismatch on ${productName} (${variantLabel})`,
          detail: `Trendz offer warranty is ${offer.warrantyMonths} months, expected ${expected.warrantyMonths} months.`,
          variantId,
        });
      }
      if (offer.status !== "ACTIVE" && expectedStock > 0) {
        issues.push("PAUSED");
        pausedWithStock++;
        alerts.push({
          severity: "warning",
          code: "OFFER_PAUSED_WITH_STOCK",
          title: `Offer ${offer.status.toLowerCase()} with stock on ${productName} (${variantLabel})`,
          detail: `ERP has ${expectedStock} unit(s) ready, but the Trendz offer status is ${offer.status}.`,
          variantId,
        });
      }
    }

    if (issues.length > 0) mismatchedVariants++;
    variantIssuesMap.set(variantId, issues);
    variantExpectedMap.set(variantId, { erpStock: rawErpStock, pendingUnits, expectedStock });

    variants.push({
      variantId,
      productName,
      variantLabel,
      groupCount: groupRows.length,
      erpStock: rawErpStock,
      pendingUnits,
      expectedStock,
      actualStock: offer?.stock ?? null,
      expectedPrice: expected.price,
      actualPrice: offer?.price ?? null,
      expectedWarrantyMonths: expected.warrantyMonths,
      actualWarrantyMonths: offer?.warrantyMonths ?? null,
      offerStatus: offer?.status ?? null,
      issues,
    });
  }

  for (const offer of offers) {
    if (mappedByVariant.has(offer.variantId)) continue;
    actualOfferUnits += offer.stock;
    if (offer.stock > 0) {
      orphanedOffers++;
      mismatchedVariants++;
      alerts.push({
        severity: "critical",
        code: "ORPHANED_OFFER",
        title: `Orphaned Trendz stock on ${offer.productName} (${offer.variantLabel})`,
        detail: `Trendz offer still lists ${offer.stock} unit(s), but no ERP group is mapped to it.`,
        variantId: offer.variantId,
      });
      variants.push({
        variantId: offer.variantId,
        productName: offer.productName,
        variantLabel: offer.variantLabel,
        groupCount: 0,
        erpStock: 0,
        pendingUnits: 0,
        expectedStock: 0,
        actualStock: offer.stock,
        expectedPrice: null,
        actualPrice: offer.price,
        expectedWarrantyMonths: null,
        actualWarrantyMonths: offer.warrantyMonths,
        offerStatus: offer.status,
        issues: ["ORPHANED_OFFER"],
      });
    }
  }

  // Optional live ERP comparison (read-only)
  const liveByKey = liveErpItems
    ? new Map(liveErpItems.map((item) => [groupKey({ productCode: item.productCode, condition: item.condition, pta: item.pta }), item]))
    : null;
  const knownKeys = new Set(
    listings.map((l) => groupKey({ productCode: l.crmProductCode, condition: l.crmCondition, pta: l.ptaStatus })),
  );
  const missingInTrendz = liveErpItems
    ? liveErpItems.filter((item) => !knownKeys.has(groupKey({ productCode: item.productCode, condition: item.condition, pta: item.pta })))
    : [];
  for (const item of missingInTrendz) {
    alerts.push({
      severity: item.stock > 0 ? "critical" : "warning",
      code: "MISSING_IN_TRENDZ",
      title: `ERP group missing in Trendz: ${item.productName}`,
      detail: `${item.productCode} · ${item.condition} · ${item.pta} has ${item.stock} unit(s) in ERP but has never been synced to Trendz.`,
    });
  }

  let unmappedGroups = 0;
  let unmappedWithStock = 0;
  let erpUnmappedUnits = 0;
  let staleGroups = 0;
  let liveErpDrifts = 0;

  const groups: GroupReconciliation[] = listings.map((row) => {
    const key = groupKey({ productCode: row.crmProductCode, condition: row.crmCondition, pta: row.ptaStatus });
    const live = liveByKey?.get(key);
    const isStaleGroup =
      source.lastSyncAt !== null &&
      row.lastStock > 0 &&
      source.lastSyncAt.getTime() - row.lastSeenAt.getTime() > SYNC_STALE_WARNING_MINUTES * 60_000;
    if (isStaleGroup) staleGroups++;

    const offer = row.variantId ? offersByVariant.get(row.variantId) ?? null : null;
    const expectedInfo = row.variantId ? variantExpectedMap.get(row.variantId) : undefined;
    const variantIssues = row.variantId ? variantIssuesMap.get(row.variantId) ?? [] : [];

    let status: GroupStatus = "OK";
    if (liveByKey) {
      if (!live && row.lastStock > 0) {
        status = "MISSING_IN_ERP";
        liveErpDrifts++;
        alerts.push({
          severity: "critical",
          code: "MISSING_IN_ERP",
          title: `Trendz holds stale stock for ${row.crmProductName}`,
          detail: `Trendz thinks ${row.crmProductCode} (${row.crmCondition} · ${row.ptaStatus}) has ${row.lastStock} unit(s), but it was absent from the live ERP check.`,
          groupId: row.id,
        });
      } else if (live && (live.stock !== row.lastStock || live.price !== row.lastPrice)) {
        status = "LIVE_ERP_DRIFT";
        liveErpDrifts++;
        alerts.push({
          severity: live.stock !== row.lastStock ? "critical" : "warning",
          code: "LIVE_ERP_DRIFT",
          title: `Live ERP drift on ${row.crmProductName}`,
          detail: `ERP live: ${live.stock} @ Rs ${live.price.toLocaleString("en-PK")} vs Trendz snapshot: ${row.lastStock} @ Rs ${row.lastPrice.toLocaleString("en-PK")}.`,
          groupId: row.id,
        });
      }
    }

    if (status === "OK") {
      if (!row.variantId) {
        status = "UNMAPPED";
        unmappedGroups++;
        erpUnmappedUnits += row.lastStock;
        if (row.lastStock > 0) unmappedWithStock++;
      } else if (variantIssues.includes("DEFICIT")) {
        status = "DEFICIT";
      } else if (variantIssues.includes("OFFER_MISSING")) {
        status = "OFFER_MISSING";
      } else if (variantIssues.includes("STOCK_MISMATCH")) {
        status = "STOCK_MISMATCH";
      } else if (variantIssues.includes("PRICE_MISMATCH")) {
        status = "PRICE_MISMATCH";
      } else if (variantIssues.includes("PAUSED")) {
        status = "PAUSED";
      } else if (isStaleGroup) {
        status = "STALE";
      }
    } else if (!row.variantId) {
      unmappedGroups++;
      erpUnmappedUnits += row.lastStock;
      if (row.lastStock > 0) unmappedWithStock++;
    }

    return {
      id: row.id,
      productCode: row.crmProductCode,
      productName: row.crmProductName,
      condition: row.crmCondition,
      pta: row.ptaStatus,
      erpStock: row.lastStock,
      erpPrice: row.lastPrice,
      erpWarrantyMonths: row.lastWarrantyMonths,
      lastSeenAt: row.lastSeenAt.toISOString(),
      variantId: row.variantId,
      mappedProduct: row.productName,
      mappedLabel: row.variantLabel,
      groupCountSharingVariant: row.variantId ? mappedByVariant.get(row.variantId)?.length ?? 1 : 0,
      pendingUnits: expectedInfo?.pendingUnits ?? 0,
      expectedVariantStock: expectedInfo?.expectedStock ?? null,
      offerStock: offer?.stock ?? null,
      offerPrice: offer?.price ?? null,
      offerStatus: offer?.status ?? null,
      ...(liveByKey && { liveErpStock: live?.stock ?? null, liveErpPrice: live?.price ?? null }),
      status,
    };
  });

  // Source-level health & operational alerts
  if (source.sellerStatus !== "APPROVED") {
    alerts.push({
      severity: "critical",
      code: "SOURCE_UNAPPROVED",
      title: "ERP seller is not approved",
      detail: `${source.sellerShopName} is ${source.sellerStatus.toLowerCase()}, so ERP requests receive 401.`,
    });
  }

  if (!source.hasHmac) {
    alerts.push({
      severity: "warning",
      code: "HMAC_NOT_CONFIGURED",
      title: "HMAC request signing is not enabled",
      detail: "Requests are authenticated with Bearer token only. Run scripts/crm-create-source.mts --rotate-hmac to enforce signed requests.",
    });
  }

  if (!source.lastSyncAt) {
    alerts.push({
      severity: "warning",
      code: "SYNC_NEVER_RAN",
      title: "No stock snapshot received yet",
      detail: "Trendz has not received a snapshot from this ERP source yet.",
    });
  } else {
    const ageMinutes = Math.floor((now.getTime() - source.lastSyncAt.getTime()) / 60_000);
    if (ageMinutes >= SYNC_STALE_CRITICAL_MINUTES) {
      alerts.push({
        severity: "critical",
        code: "SYNC_STALE",
        title: "ERP stock sync is stale",
        detail: `Last snapshot arrived ${ageMinutes} minutes ago (threshold ${SYNC_STALE_CRITICAL_MINUTES} min). Check the ERP sync service.`,
      });
    } else if (ageMinutes >= SYNC_STALE_WARNING_MINUTES) {
      alerts.push({
        severity: "warning",
        code: "SYNC_STALE",
        title: "ERP stock sync is delayed",
        detail: `Last snapshot arrived ${ageMinutes} minutes ago (warning threshold ${SYNC_STALE_WARNING_MINUTES} min).`,
      });
    }
  }

  if (unmappedWithStock > 0) {
    alerts.push({
      severity: "warning",
      code: "UNMAPPED_WITH_STOCK",
      title: `${unmappedWithStock} unmapped ERP group(s) have stock`,
      detail: `${erpUnmappedUnits} unit(s) exist in the ERP but are not listed on Trendz until an admin maps them.`,
    });
  }

  const rejectedInLastSync = source.lastSyncSummary?.rejectedItems ?? [];
  const rejectedCount = source.lastSyncSummary?.rejected ?? rejectedInLastSync.length;
  if (rejectedCount > 0) {
    alerts.push({
      severity: "warning",
      code: "REJECTED_IN_LAST_SYNC",
      title: `${rejectedCount} ERP group(s) rejected in last sync`,
      detail: "These groups failed validation (price outside range or warranty below 12 months) and were withheld from listing.",
    });
  }

  if (attention.failedCount > 0) {
    alerts.push({
      severity: "critical",
      code: "FAILED_ORDERS",
      title: `${attention.failedCount} order(s) could not be fulfilled by the ERP`,
      detail: "Review the failed orders list and cancel/refund or resolve with the buyer.",
    });
  }

  if (attention.stuckCount > 0) {
    alerts.push({
      severity: "critical",
      code: "STUCK_ORDERS",
      title: `${attention.stuckCount} order(s) waiting for ERP acknowledgement`,
      detail: "Orders placed over 30 minutes ago have not been picked up by the ERP.",
    });
  }

  if (attention.waitingCount > 0) {
    alerts.push({
      severity: "warning",
      code: "WAITING_UPDATES",
      title: `${attention.waitingCount} order update(s) not yet applied in ERP`,
      detail: "Delivered COD collections, cancellations, or refunded returns are still waiting for ERP acknowledgement.",
    });
  }

  const statusRank: Record<GroupStatus, number> = {
    DEFICIT: 0,
    OFFER_MISSING: 1,
    STOCK_MISMATCH: 2,
    MISSING_IN_ERP: 3,
    LIVE_ERP_DRIFT: 4,
    PRICE_MISMATCH: 5,
    PAUSED: 6,
    STALE: 7,
    UNMAPPED: 8,
    OK: 9,
  };
  groups.sort((a, b) => statusRank[a.status] - statusRank[b.status] || b.erpStock - a.erpStock || a.productName.localeCompare(b.productName));

  alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const warningAlerts = alerts.filter((a) => a.severity === "warning").length;

  return {
    generatedAt: now.toISOString(),
    source: {
      id: source.id,
      name: source.name,
      sellerShopName: source.sellerShopName,
      sellerStatus: source.sellerStatus,
      hasHmac: source.hasHmac,
      lastSyncAt: source.lastSyncAt?.toISOString() ?? null,
    },
    summary: {
      totalGroups: listings.length,
      mappedGroups: listings.length - unmappedGroups,
      unmappedGroups,
      unmappedWithStock,
      erpMappedUnits,
      erpUnmappedUnits,
      pendingUnits: pendingUnitsTotal,
      expectedOfferUnits,
      actualOfferUnits,
      mismatchedVariants,
      orphanedOffers,
      pausedWithStock,
      deficits,
      staleGroups,
      liveErpDrifts,
      missingInTrendz: missingInTrendz.length,
      criticalAlerts,
      warningAlerts,
    },
    alerts,
    variants,
    groups,
    missingInTrendz,
    rejectedInLastSync,
  };
}

