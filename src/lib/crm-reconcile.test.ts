import { describe, expect, it } from "vitest";
import { buildReconciliationReport, type ReconcileListingRow, type ReconcileOfferRow, type ReconcileSourceInput } from "./crm-reconcile";

const now = new Date("2026-11-10T14:00:00.000Z");

const baseSource = (over: Partial<ReconcileSourceInput> = {}): ReconcileSourceInput => ({
  id: "src_1",
  name: "Covison ERP",
  sellerId: "sel_1",
  sellerShopName: "Covison",
  sellerStatus: "APPROVED",
  commissionBps: 0,
  hasHmac: true,
  lastSyncAt: new Date(now.getTime() - 5 * 60_000),
  lastSyncSummary: { received: 1, accepted: 1, rejected: 0, unmapped: 0, offersUpdated: 1, soldOut: 0 },
  ...over,
});

const listing = (over: Partial<ReconcileListingRow> = {}): ReconcileListingRow => ({
  id: "map_1",
  crmProductCode: "IP14-128-BLK",
  crmProductName: "iPhone 14 128GB Black",
  crmCondition: "Good",
  ptaStatus: "PTA",
  lastPrice: 125000,
  lastStock: 4,
  lastWarrantyMonths: 12,
  lastSeenAt: new Date(now.getTime() - 5 * 60_000),
  variantId: "var_1",
  productName: "iPhone 14",
  variantLabel: "Good · 128 GB · Black",
  ...over,
});

const offer = (over: Partial<ReconcileOfferRow> = {}): ReconcileOfferRow => ({
  id: "off_1",
  variantId: "var_1",
  productName: "iPhone 14",
  variantLabel: "Good · 128 GB · Black",
  price: 125000,
  stock: 4,
  warrantyMonths: 12,
  status: "ACTIVE",
  ...over,
});

describe("buildReconciliationReport", () => {
  it("reports clean reconciliation when ERP stock minus pending orders matches Trendz offer", () => {
    const report = buildReconciliationReport({
      source: baseSource(),
      listings: [listing({ lastStock: 5 })],
      offers: [offer({ stock: 3 })],
      pendingByVariant: new Map([["var_1", 2]]),
      now,
    });

    expect(report.summary.criticalAlerts).toBe(0);
    expect(report.summary.warningAlerts).toBe(0);
    expect(report.summary.mismatchedVariants).toBe(0);
    expect(report.groups[0].status).toBe("OK");
    expect(report.groups[0].expectedVariantStock).toBe(3);
  });

  it("alerts on stock mismatch, orphaned offers, reservation deficit, and unmapped stock", () => {
    const report = buildReconciliationReport({
      source: baseSource({ hasHmac: false }),
      listings: [
        listing({ id: "m1", variantId: "var_1", lastStock: 2 }),
        listing({ id: "m2", crmProductCode: "S24-256", variantId: null, lastStock: 3 }),
      ],
      offers: [
        offer({ variantId: "var_1", stock: 5 }), // drifted from expected 0 (2 - 3 pending)
        offer({ id: "off_orphan", variantId: "var_orphan", stock: 2, variantLabel: "Orphan" }),
      ],
      pendingByVariant: new Map([["var_1", 3]]), // deficit: 3 pending > 2 ERP
      now,
    });

    const codes = report.alerts.map((a) => a.code);
    expect(codes).toContain("RESERVATION_DEFICIT");
    expect(codes).toContain("OFFER_STOCK_MISMATCH");
    expect(codes).toContain("ORPHANED_OFFER");
    expect(codes).toContain("UNMAPPED_WITH_STOCK");
    expect(codes).toContain("HMAC_NOT_CONFIGURED");
    expect(report.summary.deficits).toBe(1);
    expect(report.summary.orphanedOffers).toBe(1);
    expect(report.summary.unmappedWithStock).toBe(1);
  });

  it("alerts when sync is stale or items were rejected in the last sync", () => {
    const report = buildReconciliationReport({
      source: baseSource({
        lastSyncAt: new Date(now.getTime() - 200 * 60_000),
        lastSyncSummary: {
          rejected: 1,
          rejectedItems: [{ productCode: "BAD-1", condition: "Good", pta: "PTA", reason: "Warranty too short" }],
        },
      }),
      listings: [listing()],
      offers: [offer()],
      pendingByVariant: new Map(),
      now,
    });

    const codes = report.alerts.map((a) => a.code);
    expect(codes).toContain("SYNC_STALE");
    expect(codes).toContain("REJECTED_IN_LAST_SYNC");
    expect(report.rejectedInLastSync).toHaveLength(1);
  });

  it("detects live ERP drift and items missing in Trendz without mutating state", () => {
    const report = buildReconciliationReport({
      source: baseSource(),
      listings: [listing({ lastStock: 4, lastPrice: 125000 })],
      offers: [offer({ stock: 4, price: 125000 })],
      pendingByVariant: new Map(),
      liveErpItems: [
        {
          productCode: "IP14-128-BLK",
          productName: "iPhone 14 128GB Black",
          condition: "Good",
          pta: "PTA",
          price: 120000,
          stock: 2,
          warrantyMonths: 12,
        },
        {
          productCode: "NEW-1",
          productName: "Pixel 9",
          condition: "Good",
          pta: "PTA",
          price: 150000,
          stock: 1,
          warrantyMonths: 12,
        },
      ],
      now,
    });

    expect(report.summary.liveErpDrifts).toBe(1);
    expect(report.summary.missingInTrendz).toBe(1);
    expect(report.groups[0].status).toBe("LIVE_ERP_DRIFT");
    expect(report.groups[0].liveErpStock).toBe(2);
    expect(report.missingInTrendz[0].productCode).toBe("NEW-1");
  });
});

