import "server-only";
import type { FulfillmentStatus as DbFulfillmentStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { canApply, type FulfillmentAction, RESULT_OF, rollupOrderStatus } from "@/lib/fulfillment";
import { formatOrderNumber } from "@/lib/order-number";
import { isPaidOnline, refundOnlinePayment } from "@/lib/payments/service";
import { PaymentGatewayError } from "@/lib/payments/types";
import { getSellerEarnings } from "@/lib/payouts";
import { sendSms } from "@/lib/sms";

export class FulfillmentError extends Error {}

/** Sellers only see orders that are cash on delivery or already paid online. */
const payable = {
  order: { OR: [{ paymentMethod: "COD" }, { paymentStatus: { in: ["PAID", "REFUNDED"] } }] },
} satisfies Prisma.SellerOrderWhereInput;

export const SELLER_ORDER_TABS = [
  { status: "PENDING", label: "To confirm" },
  { status: "CONFIRMED", label: "To ship" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
  { status: "CANCELLED", label: "Cancelled" },
] as const;

const listSelect = {
  id: true,
  status: true,
  subtotal: true,
  shippingFee: true,
  commission: true,
  order: { select: { number: true, createdAt: true, shipCity: true, paymentMethod: true } },
  items: { select: { productName: true, variantLabel: true, quantity: true } },
} satisfies Prisma.SellerOrderSelect;

export async function listSellerOrders(sellerId: string, status: DbFulfillmentStatus) {
  const [counts, orders] = await Promise.all([
    db.sellerOrder.groupBy({ by: ["status"], where: { sellerId, ...payable }, _count: { _all: true } }),
    db.sellerOrder.findMany({
      where: { sellerId, status, ...payable },
      orderBy: { order: { createdAt: status === "PENDING" || status === "CONFIRMED" ? "asc" : "desc" } },
      take: 100,
      select: listSelect,
    }),
  ]);
  return { counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])), orders };
}

export function getSellerOrder(sellerId: string, id: string) {
  return db.sellerOrder.findFirst({
    where: { id, sellerId, ...payable },
    select: {
      ...listSelect,
      courier: true,
      trackingNumber: true,
      shippedAt: true,
      deliveredAt: true,
      order: {
        select: {
          number: true,
          createdAt: true,
          paymentMethod: true,
          shipName: true,
          shipPhone: true,
          shipLine1: true,
          shipLine2: true,
          shipCity: true,
          shipProvince: true,
        },
      },
      items: {
        select: {
          id: true,
          productName: true,
          variantLabel: true,
          quantity: true,
          unitPrice: true,
          returnRequests: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, reason: true } },
        },
      },
    },
  });
}

/**
 * Moves a seller's shipment forward (confirm → ship → deliver) or cancels it,
 * then updates the buyer's order status, totals and payment to match.
 */
export async function applyFulfillment(
  sellerId: string,
  sellerOrderId: string,
  action: FulfillmentAction,
  shipping?: { courier: string; trackingNumber: string },
) {
  if (action === "cancel") await refundBeforeSellerCancel(sellerId, sellerOrderId);

  const result = await db.$transaction(async (tx) => {
    const so = await tx.sellerOrder.findFirst({
      where: { id: sellerOrderId, sellerId, ...payable },
      select: {
        status: true,
        subtotal: true,
        shippingFee: true,
        orderId: true,
        seller: { select: { shopName: true } },
        items: { select: { offerId: true, quantity: true, productName: true } },
      },
    });
    if (!so) throw new FulfillmentError("Order not found.");
    if (!canApply(so.status, action)) throw new FulfillmentError("That step isn't possible for this order any more.");
    if (action === "ship" && (!shipping?.courier || !shipping.trackingNumber.trim())) {
      throw new FulfillmentError("Choose a courier and enter the tracking number.");
    }

    const now = new Date();
    await tx.sellerOrder.update({
      where: { id: sellerOrderId },
      data: {
        status: RESULT_OF[action],
        ...(action === "ship" && { courier: shipping!.courier, trackingNumber: shipping!.trackingNumber.trim(), shippedAt: now }),
        ...(action === "deliver" && { deliveredAt: now }),
      },
    });

    if (action === "cancel") {
      for (const item of so.items) {
        await tx.offer.update({ where: { id: item.offerId }, data: { stock: { increment: item.quantity } } });
      }
    }

    const siblings = await tx.sellerOrder.findMany({ where: { orderId: so.orderId }, select: { status: true } });
    const orderStatus = rollupOrderStatus(siblings.map((s) => s.status));
    const order = await tx.order.update({
      where: { id: so.orderId },
      data: {
        status: orderStatus,
        // A cancelled shipment is no longer charged to the buyer.
        ...(action === "cancel" &&
          orderStatus !== "CANCELLED" && {
            subtotal: { decrement: so.subtotal },
            shippingFee: { decrement: so.shippingFee },
            total: { decrement: so.subtotal + so.shippingFee },
          }),
        // Cash on delivery is collected once everything has been delivered.
        ...(orderStatus === "DELIVERED" && { paymentStatus: "PAID" }),
      },
      select: { id: true, number: true, shipPhone: true, total: true, paymentMethod: true, paymentStatus: true },
    });
    if (order.paymentStatus === "PAID") {
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { status: "PAID", amount: order.total } });
    } else if (action === "cancel") {
      await tx.payment.updateMany({ where: { orderId: order.id }, data: { amount: order.total } });
    }

    return { order, seller: so.seller.shopName, items: so.items.map((i) => i.productName).join(", ") };
  });

  const number = formatOrderNumber(result.order.number);
  const message = {
    confirm: `Trendz: ${result.seller} confirmed your order ${number} and is preparing it.`,
    ship: `Trendz: ${result.items} from order ${number} has shipped with ${shipping?.courier}. Tracking: ${shipping?.trackingNumber}.`,
    deliver: `Trendz: order ${number} from ${result.seller} was delivered. Enjoy! You have 15 days to return it for free.`,
    cancel: `Trendz: ${result.seller} couldn't fulfil ${result.items} in order ${number}. You won't be charged for it.`,
  }[action];
  try {
    await sendSms(result.order.shipPhone, message);
  } catch (e) {
    console.error("[notify] SMS failed", e);
  }
}

/** Headline numbers for the seller overview. */
export async function getSellerOverview(sellerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [counts, liveListings, soldOut, monthSales, earnings] = await Promise.all([
    db.sellerOrder.groupBy({ by: ["status"], where: { sellerId, ...payable }, _count: { _all: true } }),
    db.offer.count({ where: { sellerId, status: "ACTIVE", stock: { gt: 0 } } }),
    db.offer.count({ where: { sellerId, status: "ACTIVE", stock: 0 } }),
    db.sellerOrder.aggregate({
      where: {
        sellerId,
        status: { notIn: ["CANCELLED", "RETURNED"] },
        AND: [payable, { order: { createdAt: { gte: monthStart } } }],
      },
      _sum: { subtotal: true },
      _count: { _all: true },
    }),
    getSellerEarnings(sellerId),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return {
    toConfirm: count("PENDING"),
    toShip: count("CONFIRMED"),
    inTransit: count("SHIPPED"),
    liveListings,
    soldOut,
    monthSales: monthSales._sum.subtotal ?? 0,
    monthOrders: monthSales._count._all,
    available: earnings.available,
    onHold: earnings.onHold,
  };
}

/** A seller can't fulfil part of a card-paid order: give that part back first. */
async function refundBeforeSellerCancel(sellerId: string, sellerOrderId: string) {
  const so = await db.sellerOrder.findFirst({
    where: { id: sellerOrderId, sellerId },
    select: { status: true, orderId: true, subtotal: true, shippingFee: true },
  });
  if (!so || !canApply(so.status, "cancel") || !(await isPaidOnline(so.orderId))) return;
  try {
    await refundOnlinePayment(so.orderId, so.subtotal + so.shippingFee);
  } catch (e) {
    if (e instanceof PaymentGatewayError) {
      console.error("[seller-orders] refund failed", e);
      throw new FulfillmentError("We couldn't refund the buyer's card just now, so the order wasn't cancelled. Try again shortly.");
    }
    throw e;
  }
}
