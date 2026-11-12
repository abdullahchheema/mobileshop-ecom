import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatOrderNumber } from "@/lib/order-number";

export const STUCK_AFTER_MINUTES = 30;
const ORDER_LIMIT = 50;

type Source = { id: string; sellerId: string; createdAt: Date };

/**
 * Seller orders the ERP must book: bought (cash on delivery, or card and paid), still alive,
 * and placed after the integration began (so old demo orders never flow into real books).
 */
export const bookableOrders = (sellerId: string, since: Date): Prisma.SellerOrderWhereInput => ({
  sellerId,
  status: { notIn: ["CANCELLED", "RETURNED"] },
  order: { createdAt: { gte: since }, OR: [{ paymentMethod: "COD" }, { paymentStatus: "PAID" }] },
});

const unacknowledged = (source: Source): Prisma.SellerOrderWhereInput => ({
  ...bookableOrders(source.sellerId, source.createdAt),
  crmSync: { is: null },
});

/** Units sold online per variant that the ERP has not acknowledged yet. */
export async function pendingByVariant(client: Prisma.TransactionClient, source: { sellerId: string; createdAt: Date }) {
  const items = await client.orderItem.findMany({
    where: { sellerOrder: unacknowledged({ id: "", ...source }) },
    select: { quantity: true, offer: { select: { variantId: true } } },
  });
  const pending = new Map<string, number>();
  for (const item of items) pending.set(item.offer.variantId, (pending.get(item.offer.variantId) ?? 0) + item.quantity);
  return pending;
}

/** The orders the ERP should fetch next, oldest first, each with the ERP stock groups its items can come from. */
export async function listOrdersForErp(source: Source) {
  const orders = await db.sellerOrder.findMany({
    where: unacknowledged(source),
    orderBy: { order: { createdAt: "asc" } },
    take: ORDER_LIMIT,
    select: {
      id: true,
      shippingFee: true,
      order: {
        select: {
          number: true,
          createdAt: true,
          paymentMethod: true,
          paymentStatus: true,
          shipName: true,
          shipPhone: true,
          shipLine1: true,
          shipLine2: true,
          shipCity: true,
          payments: { where: { status: "PAID" }, select: { providerRef: true }, take: 1 },
        },
      },
      items: {
        select: { id: true, productName: true, variantLabel: true, unitPrice: true, quantity: true, offer: { select: { variantId: true } } },
      },
    },
  });

  const variantIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.offer.variantId)))];
  const maps = await db.crmListingMap.findMany({
    where: { sourceId: source.id, variantId: { in: variantIds } },
    select: { variantId: true, crmProductCode: true, crmCondition: true, ptaStatus: true },
  });

  return orders.map((o) => ({
    sellerOrderId: o.id,
    orderNumber: formatOrderNumber(o.order.number),
    placedAt: o.order.createdAt.toISOString(),
    paymentMethod: o.order.paymentMethod,
    paid: o.order.paymentStatus === "PAID",
    paymentReference: o.order.payments[0]?.providerRef ?? null,
    shippingFee: o.shippingFee,
    buyer: {
      name: o.order.shipName,
      phone: o.order.shipPhone,
      city: o.order.shipCity,
      address: [o.order.shipLine1, o.order.shipLine2].filter(Boolean).join(", "),
    },
    items: o.items.map((i) => ({
      itemId: i.id,
      productName: i.productName,
      variantLabel: i.variantLabel,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      // Which ERP stock groups this variant is mapped to; the ERP takes the cheapest available phone among them.
      groups: maps
        .filter((m) => m.variantId === i.offer.variantId)
        .map((m) => ({ productCode: m.crmProductCode, condition: m.crmCondition, pta: m.ptaStatus })),
    })),
  }));
}

type Ack =
  | { sellerOrderId: string; status: "BOOKED"; documents: string[] }
  | { sellerOrderId: string; status: "FAILED"; reason: string };

/** Records the ERP's answers. An order that is already booked is never overwritten by a later answer. */
export async function acknowledgeOrders(source: Source, results: Ack[]) {
  const ids = results.map((r) => r.sellerOrderId);
  const owned = new Set(
    (await db.sellerOrder.findMany({ where: { id: { in: ids }, sellerId: source.sellerId }, select: { id: true } })).map((o) => o.id),
  );
  const existing = new Map(
    (await db.crmOrderSync.findMany({ where: { sellerOrderId: { in: ids } }, select: { sellerOrderId: true, status: true } })).map((r) => [r.sellerOrderId, r.status]),
  );

  const ignored: { sellerOrderId: string; reason: string }[] = [];
  let recorded = 0;
  for (const r of results) {
    if (!owned.has(r.sellerOrderId)) {
      ignored.push({ sellerOrderId: r.sellerOrderId, reason: "Not an order of this seller." });
      continue;
    }
    if (existing.get(r.sellerOrderId) === "BOOKED") {
      ignored.push({ sellerOrderId: r.sellerOrderId, reason: "Already booked." });
      continue;
    }
    const data =
      r.status === "BOOKED"
        ? { status: "BOOKED" as const, documents: r.documents, reason: null }
        : { status: "FAILED" as const, documents: [], reason: r.reason };
    await db.crmOrderSync.upsert({
      where: { sellerOrderId: r.sellerOrderId },
      update: data,
      create: { ...data, sellerOrderId: r.sellerOrderId, sourceId: source.id },
    });
    recorded++;
  }
  return { recorded, ignored };
}

type UpdateCutoff = Date | undefined;

/**
 * Things that happened to an order after the ERP booked it and that the ERP has not applied yet:
 * cash collected on delivery, a cancellation, a refunded return. `before` limits to those waiting longer than that.
 */
async function pendingUpdates(source: Source, before?: UpdateCutoff) {
  const booked = { sourceId: source.id, status: "BOOKED" as const };
  const [collections, cancellations, returns] = await Promise.all([
    db.crmOrderSync.findMany({
      where: {
        ...booked,
        collectedAt: null,
        reversedAt: null,
        sellerOrder: { status: "DELIVERED", order: { paymentMethod: "COD" }, ...(before && { deliveredAt: { lt: before } }) },
      },
      orderBy: { updatedAt: "asc" },
      take: ORDER_LIMIT,
      select: { documents: true, sellerOrder: { select: { id: true, order: { select: { id: true, number: true } } } } },
    }),
    db.crmOrderSync.findMany({
      where: { ...booked, reversedAt: null, sellerOrder: { status: "CANCELLED", ...(before && { order: { updatedAt: { lt: before } } }) } },
      orderBy: { updatedAt: "asc" },
      take: ORDER_LIMIT,
      select: { documents: true, sellerOrder: { select: { id: true, order: { select: { id: true, number: true } } } } },
    }),
    db.returnRequest.findMany({
      where: {
        status: "REFUNDED",
        crmSync: { is: null },
        orderItem: { sellerOrder: { crmSync: { is: booked } } },
        ...(before && { refundedAt: { lt: before } }),
      },
      orderBy: { updatedAt: "asc" },
      take: ORDER_LIMIT,
      select: {
        id: true,
        reason: true,
        refundAmount: true,
        refundRef: true,
        orderItem: {
          select: { id: true, quantity: true, sellerOrder: { select: { id: true, order: { select: { id: true, number: true } } } } },
        },
      },
    }),
  ]);
  return { collections, cancellations, returns };
}

/** What the ERP must do next to orders it already booked. Repeated calls return the same work until it is acknowledged. */
export async function listUpdatesForErp(source: Source) {
  const { collections, cancellations, returns } = await pendingUpdates(source);
  const brief = (o: { sellerOrder: { id: string; order: { number: number } } }) => ({
    sellerOrderId: o.sellerOrder.id,
    orderNumber: formatOrderNumber(o.sellerOrder.order.number),
  });
  return {
    // Cash on delivery orders the courier delivered: record the cash received against the invoices.
    collections: collections.map((c) => brief(c)),
    // Orders cancelled after booking (before shipping): cancel the invoices and payments, the phones go back to stock.
    cancellations: cancellations.map((c) => brief(c)),
    // Returns Trendz has refunded: post the return credit and the refund. All units of the order line come back.
    returns: returns.map((r) => ({
      returnId: r.id,
      ...brief({ sellerOrder: r.orderItem.sellerOrder }),
      itemId: r.orderItem.id,
      quantity: r.orderItem.quantity,
      reason: r.reason,
      refundAmount: r.refundAmount,
      refundReference: r.refundRef,
    })),
  };
}

type UpdateAck = { kind: "COLLECTED" | "REVERSED" | "RETURNED"; id: string; documents: string[] };

/** Records what the ERP applied. Unknown or foreign ids are ignored; repeating an answer is harmless. */
export async function acknowledgeUpdates(source: Source, results: UpdateAck[]) {
  const ignored: { id: string; reason: string }[] = [];
  let recorded = 0;
  const now = new Date();

  for (const r of results) {
    if (r.kind === "RETURNED") {
      const found = await db.returnRequest.findFirst({
        where: { id: r.id, orderItem: { sellerOrder: { crmSync: { is: { sourceId: source.id } } } } },
        select: { id: true },
      });
      if (!found) {
        ignored.push({ id: r.id, reason: "Not a return of this source." });
        continue;
      }
      await db.crmReturnSync.upsert({
        where: { returnRequestId: r.id },
        update: { documents: r.documents },
        create: { returnRequestId: r.id, sourceId: source.id, documents: r.documents },
      });
      recorded++;
      continue;
    }
    const field = r.kind === "COLLECTED" ? "collectedAt" : "reversedAt";
    const existingRow = await db.crmOrderSync.findFirst({
      where: { sellerOrderId: r.id, sourceId: source.id, status: "BOOKED" },
      select: { id: true, collectedAt: true, reversedAt: true },
    });
    if (!existingRow) {
      ignored.push({ id: r.id, reason: "Not a booked order of this source." });
    } else {
      if (!existingRow[field]) {
        await db.crmOrderSync.update({ where: { id: existingRow.id }, data: { [field]: now } });
      }
      recorded++;
    }
  }
  return { recorded, ignored };
}

/** Counts failed, stuck, and unapplied-update orders for one ERP source (for reconciliation alerts). */
export async function getErpAttentionCountsForSource(source: Source) {
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000);
  const [failedCount, stuckCount, waiting] = await Promise.all([
    db.crmOrderSync.count({
      where: { sourceId: source.id, status: "FAILED", sellerOrder: { status: { notIn: ["CANCELLED", "RETURNED"] } } },
    }),
    db.sellerOrder.count({
      where: { ...unacknowledged(source), AND: { order: { createdAt: { lt: cutoff } } } },
    }),
    pendingUpdates(source, cutoff),
  ]);
  return {
    failedCount,
    stuckCount,
    waitingCount: waiting.collections.length + waiting.cancellations.length + waiting.returns.length,
  };
}

/** What an admin must look at: orders the ERP could not fulfil, orders it never answered, and updates it has not applied. */
export async function getErpAttention() {
  const sources = await db.crmSource.findMany({ select: { id: true, sellerId: true, createdAt: true } });
  const cutoff = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000);
  const brief = { id: true, order: { select: { id: true, number: true, createdAt: true } } } as const;

  const perSource = await Promise.all(
    sources.map(async (s) => {
      const [failed, stuck, waiting] = await Promise.all([
        db.crmOrderSync.findMany({
          where: { sourceId: s.id, status: "FAILED", sellerOrder: { status: { notIn: ["CANCELLED", "RETURNED"] } } },
          orderBy: { updatedAt: "desc" },
          take: 50,
          select: { reason: true, sellerOrder: { select: brief } },
        }),
        db.sellerOrder.findMany({
          where: { ...unacknowledged(s), AND: { order: { createdAt: { lt: cutoff } } } },
          orderBy: { order: { createdAt: "asc" } },
          take: 50,
          select: brief,
        }),
        pendingUpdates(s, cutoff),
      ]);
      return { failed, stuck, waiting };
    }),
  );

  const link = (orderId: string, number: number, placedAt: Date) => ({ orderId, number: formatOrderNumber(number), placedAt });
  return {
    failed: perSource.flatMap((p) => p.failed.map((f) => ({ ...link(f.sellerOrder.order.id, f.sellerOrder.order.number, f.sellerOrder.order.createdAt), reason: f.reason ?? "" }))),
    stuck: perSource.flatMap((p) => p.stuck.map((o) => link(o.order.id, o.order.number, o.order.createdAt))),
    waiting: perSource.flatMap((p) => [
      ...p.waiting.collections.map((c) => ({ orderId: c.sellerOrder.order.id, number: formatOrderNumber(c.sellerOrder.order.number), what: "cash collected on delivery" })),
      ...p.waiting.cancellations.map((c) => ({ orderId: c.sellerOrder.order.id, number: formatOrderNumber(c.sellerOrder.order.number), what: "cancellation" })),
      ...p.waiting.returns.map((r) => ({ orderId: r.orderItem.sellerOrder.order.id, number: formatOrderNumber(r.orderItem.sellerOrder.order.number), what: "refunded return" })),
    ]),
  };
}
