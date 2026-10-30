import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { earningAfterRefunds, payoutStatus, type ReturnStatus } from "@/lib/returns";
import { formatPkr } from "@/lib/site";
import { sendSms } from "@/lib/sms";

export class PayoutError extends Error {}

const unpaidShipmentSelect = {
  id: true,
  sellerId: true,
  status: true,
  subtotal: true,
  shippingFee: true,
  commission: true,
  deliveredAt: true,
  payoutId: true,
  order: { select: { number: true } },
  items: { select: { returnRequests: { select: { status: true, refundAmount: true } } } },
} satisfies Prisma.SellerOrderSelect;

type UnpaidShipment = Prisma.SellerOrderGetPayload<{ select: typeof unpaidShipmentSelect }>;

/** Delivered, not-yet-paid shipments with their earning (after refunds) and payout state. */
function classify(shipments: UnpaidShipment[], now: Date) {
  return shipments.map((s) => {
    const returns = s.items.flatMap((i) => i.returnRequests);
    const refunded = returns.reduce((sum, r) => sum + (r.status === "REFUNDED" ? (r.refundAmount ?? 0) : 0), 0);
    return {
      id: s.id,
      sellerId: s.sellerId,
      number: s.order.number,
      deliveredAt: s.deliveredAt,
      earning: earningAfterRefunds(s, refunded),
      refunded,
      state: payoutStatus(s, returns.map((r) => r.status as ReturnStatus), now),
    };
  });
}

function unpaidDelivered(where: Prisma.SellerOrderWhereInput = {}) {
  return db.sellerOrder.findMany({
    where: { ...where, status: "DELIVERED", payoutId: null },
    orderBy: { deliveredAt: "asc" },
    select: unpaidShipmentSelect,
  });
}

/** One seller's money: payable now, held in the return window, and history. */
export async function getSellerEarnings(sellerId: string, now = new Date()) {
  const money = { subtotal: true, shippingFee: true, commission: true } as const;
  const [unpaid, upcoming, payouts] = await Promise.all([
    unpaidDelivered({ sellerId }),
    db.sellerOrder.findMany({ where: { sellerId, status: { in: ["PENDING", "CONFIRMED", "SHIPPED"] } }, select: money }),
    db.payout.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, take: 24 }),
  ]);
  const shipments = classify(unpaid, now);
  const sum = (list: typeof shipments) => list.reduce((n, s) => n + s.earning, 0);
  const eligible = shipments.filter((s) => s.state === "eligible");
  const onHold = shipments.filter((s) => s.state === "on_hold");

  return {
    available: sum(eligible),
    onHold: sum(onHold),
    shipments,
    upcoming: upcoming.reduce((n, o) => n + o.subtotal + o.shippingFee - o.commission, 0),
    upcomingCount: upcoming.length,
    payouts,
  };
}

/** Every seller with money owed, for the admin payout run. */
export async function getPayoutCandidates(now = new Date()) {
  const shipments = classify(await unpaidDelivered(), now);
  const sellerIds = [...new Set(shipments.map((s) => s.sellerId))];
  const sellers = await db.seller.findMany({
    where: { id: { in: sellerIds } },
    select: { id: true, shopName: true, bankName: true, accountTitle: true, iban: true },
  });

  return sellers
    .map((seller) => {
      const mine = shipments.filter((s) => s.sellerId === seller.id);
      const eligible = mine.filter((s) => s.state === "eligible");
      const held = mine.filter((s) => s.state === "on_hold");
      return {
        seller,
        eligibleAmount: eligible.reduce((n, s) => n + s.earning, 0),
        eligibleCount: eligible.length,
        heldAmount: held.reduce((n, s) => n + s.earning, 0),
        heldCount: held.length,
      };
    })
    .sort((a, b) => b.eligibleAmount - a.eligibleAmount);
}

/** Bundles a seller's eligible shipments into a PENDING payout, ready for a bank transfer. */
export async function createPayout(sellerId: string, now = new Date()) {
  return db.$transaction(async (tx) => {
    const shipments = classify(
      await tx.sellerOrder.findMany({
        where: { sellerId, status: "DELIVERED", payoutId: null },
        select: unpaidShipmentSelect,
      }),
      now,
    ).filter((s) => s.state === "eligible");
    if (shipments.length === 0) throw new PayoutError("Nothing is ready to pay for this seller yet.");

    const dates = shipments.map((s) => s.deliveredAt!.getTime());
    const payout = await tx.payout.create({
      data: {
        sellerId,
        amount: shipments.reduce((n, s) => n + s.earning, 0),
        periodStart: new Date(Math.min(...dates)),
        periodEnd: new Date(Math.max(...dates)),
      },
      select: { id: true, amount: true },
    });
    // payoutId: null in the filter stops two runs from claiming the same shipment.
    const claimed = await tx.sellerOrder.updateMany({
      where: { id: { in: shipments.map((s) => s.id) }, payoutId: null },
      data: { payoutId: payout.id },
    });
    if (claimed.count !== shipments.length) throw new PayoutError("Another payout run claimed these orders. Refresh and retry.");
    return payout;
  });
}

export async function markPayoutPaid(payoutId: string, reference: string) {
  const payout = await db.payout.update({
    where: { id: payoutId, status: "PENDING" },
    data: { status: "PAID", reference, paidAt: new Date() },
    select: { amount: true, seller: { select: { phone: true, bankName: true } } },
  });
  try {
    await sendSms(
      payout.seller.phone,
      `Trendz: we've sent your payout of ${formatPkr(payout.amount)} to your ${payout.seller.bankName ?? "bank"} account. Ref ${reference}.`,
    );
  } catch (e) {
    console.error("[notify] SMS failed", e);
  }
}

export function listPayouts(status: "PENDING" | "PAID") {
  return db.payout.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      seller: { select: { shopName: true, bankName: true, accountTitle: true, iban: true } },
      _count: { select: { sellerOrders: true } },
    },
  });
}
