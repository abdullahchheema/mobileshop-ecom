import "server-only";
import { db } from "@/lib/db";
import { rollupOrderStatus } from "@/lib/fulfillment";
import { formatOrderNumber } from "@/lib/order-number";
import { isPaidOnline, refundOnlinePayment } from "@/lib/payments/service";
import { PaymentGatewayError } from "@/lib/payments/types";
import { canRequestReturn, nextReturnStatus, type ReturnAction, type ReturnStatus } from "@/lib/returns";
import { formatPkr } from "@/lib/site";
import { sendSms } from "@/lib/sms";

export class ReturnError extends Error {}

async function notify(phone: string, message: string) {
  try {
    await sendSms(phone, message);
  } catch (e) {
    console.error("[notify] SMS failed", e);
  }
}

/** A buyer asks to return one order line (all its units) within the return window. */
export async function requestReturn(userId: string, orderItemId: string, input: { reason: string; details?: string }) {
  const item = await db.orderItem.findFirst({
    where: { id: orderItemId, sellerOrder: { order: { userId } } },
    select: {
      productName: true,
      sellerOrder: { select: { status: true, deliveredAt: true, order: { select: { number: true, shipPhone: true } } } },
      returnRequests: { select: { status: true } },
    },
  });
  if (!item) throw new ReturnError("Item not found.");
  if (item.sellerOrder.status !== "DELIVERED") throw new ReturnError("You can return items once they've been delivered.");
  if (!canRequestReturn(item.sellerOrder.deliveredAt, new Date())) {
    throw new ReturnError("The return window for this item has closed. Contact support if it's faulty: it's still under warranty.");
  }
  if (item.returnRequests.some((r) => r.status !== "REJECTED")) throw new ReturnError("You've already asked to return this item.");

  await db.returnRequest.create({ data: { orderItemId, reason: input.reason, details: input.details } });
  await notify(
    item.sellerOrder.order.shipPhone,
    `Trendz: we've received your return request for ${item.productName} (order ${formatOrderNumber(item.sellerOrder.order.number)}). We'll reply within 1 working day.`,
  );
}

const returnSelect = {
  id: true,
  status: true,
  reason: true,
  details: true,
  resolution: true,
  refundAmount: true,
  refundRef: true,
  createdAt: true,
  orderItem: {
    select: {
      id: true,
      productName: true,
      variantLabel: true,
      unitPrice: true,
      quantity: true,
      sellerOrder: {
        select: {
          id: true,
          seller: { select: { shopName: true, city: true, phone: true } },
          order: { select: { id: true, number: true, shipName: true, shipPhone: true, shipCity: true, paymentMethod: true } },
        },
      },
    },
  },
} as const;

export function listReturns(status: ReturnStatus, sellerId?: string) {
  return db.returnRequest.findMany({
    where: { status, ...(sellerId && { orderItem: { sellerOrder: { sellerId } } }) },
    orderBy: { createdAt: "asc" }, take: 100, select: returnSelect });
}

export async function countReturnsByStatus(sellerId?: string) {
  const rows = await db.returnRequest.groupBy({
    by: ["status"],
    ...(sellerId && { where: { orderItem: { sellerOrder: { sellerId } } } }),
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<ReturnStatus, number>>;
}

/**
 * Admin moves a return forward. Refunding records the amount and, once every
 * line in that seller's shipment is refunded, marks the shipment RETURNED.
 */
export async function applyReturnAction(id: string, action: ReturnAction, input: { note?: string; refundRef?: string }) {
  // Card payments are refunded through the gateway before anything is recorded.
  if (action === "refund") {
    const pending = await db.returnRequest.findUnique({ where: { id }, select: returnSelect });
    if (pending && nextReturnStatus(pending.status, "refund")) {
      const orderId = pending.orderItem.sellerOrder.order.id;
      if (await isPaidOnline(orderId)) {
        try {
          const ref = await refundOnlinePayment(orderId, pending.orderItem.unitPrice * pending.orderItem.quantity);
          if (ref) input = { ...input, refundRef: ref };
        } catch (e) {
          if (e instanceof PaymentGatewayError) {
            console.error("[returns] gateway refund failed", e);
            throw new ReturnError("The card refund failed at the payment gateway. Nothing was changed; try again shortly.");
          }
          throw e;
        }
      }
    }
  }

  const result = await db.$transaction(async (tx) => {
    const request = await tx.returnRequest.findUnique({ where: { id }, select: returnSelect });
    if (!request) throw new ReturnError("Return not found.");
    const next = nextReturnStatus(request.status, action);
    if (!next) throw new ReturnError("That step isn't possible for this return.");
    if (action === "refund" && !input.refundRef?.trim()) throw new ReturnError("Enter the refund transfer reference.");
    if (action === "reject" && !input.note?.trim()) throw new ReturnError("Tell the buyer why the return was rejected.");

    const item = request.orderItem;
    const refundAmount = item.unitPrice * item.quantity;
    await tx.returnRequest.update({
      where: { id },
      data: {
        status: next,
        ...(input.note?.trim() && { resolution: input.note.trim() }),
        ...(action === "refund" && { refundAmount, refundRef: input.refundRef!.trim(), refundedAt: new Date() }),
      },
    });

    if (action === "refund") {
      const lines = await tx.orderItem.findMany({
        where: { sellerOrderId: item.sellerOrder.id },
        select: { returnRequests: { select: { status: true } } },
      });
      const allRefunded = lines.every((l) => l.returnRequests.some((r) => r.status === "REFUNDED"));
      if (allRefunded) {
        await tx.sellerOrder.update({ where: { id: item.sellerOrder.id }, data: { status: "RETURNED" } });
        const orderId = item.sellerOrder.order.id;
        const siblings = await tx.sellerOrder.findMany({ where: { orderId }, select: { status: true } });
        const status = rollupOrderStatus(siblings.map((s) => s.status));
        // Everything came back and was refunded: the payment itself is now refunded.
        const fullyRefunded = status === "RETURNED";
        await tx.order.update({ where: { id: orderId }, data: { status, ...(fullyRefunded && { paymentStatus: "REFUNDED" }) } });
        if (fullyRefunded) await tx.payment.updateMany({ where: { orderId }, data: { status: "REFUNDED" } });
      }
    }
    return { request, refundAmount };
  });

  const { request, refundAmount } = result;
  const order = request.orderItem.sellerOrder.order;
  const number = formatOrderNumber(order.number);
  const product = request.orderItem.productName;
  const seller = request.orderItem.sellerOrder.seller;

  if (action === "approve") {
    await notify(order.shipPhone, `Trendz: your return of ${product} (${number}) is approved. A courier will collect it within 2 working days.`);
    await notify(seller.phone, `Trendz: a buyer is returning ${product} from order ${number}. It will be sent back to you.`);
  } else if (action === "reject") {
    await notify(order.shipPhone, `Trendz: we couldn't accept the return of ${product} (${number}): ${input.note}`);
  } else if (action === "refund") {
    await notify(order.shipPhone, `Trendz: we've refunded ${formatPkr(refundAmount)} for ${product} (${number}). Ref ${input.refundRef}.`);
  }
}

