import "server-only";
import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import { getCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { formatOrderNumber } from "@/lib/order-number";
import { getCheckoutProvider } from "@/lib/payments";
import { isPaidOnline, PAYMENT_WINDOW_MINUTES, refundOnlinePayment } from "@/lib/payments/service";
import { PaymentGatewayError } from "@/lib/payments/types";
import { formatPkr } from "@/lib/site";
import { commission } from "@/lib/shipping";
import { sendSms } from "@/lib/sms";

export { formatOrderNumber };

/**
 * Payment methods buyers can choose right now. Cards go through the configured
 * gateway; wallets stay off until Safepay wallet support is confirmed.
 */
export function enabledPaymentMethods(): PaymentMethod[] {
  return getCheckoutProvider() ? ["COD", "CARD"] : ["COD"];
}

export class CheckoutError extends Error {
  constructor(
    public code:
      | "EMPTY_CART"
      | "ADDRESS_NOT_FOUND"
      | "PAYMENT_METHOD_UNAVAILABLE"
      | "ITEMS_UNAVAILABLE"
      | "PRICE_CHANGED"
      | "OUT_OF_STOCK"
      | "NOT_CANCELLABLE"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Turns the user's cart into an order: one SellerOrder per seller, stock
 * reserved atomically, cart emptied. Prices always come from the database;
 * `expectedTotal` guards against charging a total the buyer didn't see.
 */
export async function placeOrder(input: {
  userId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  expectedTotal: number;
}) {
  if (!enabledPaymentMethods().includes(input.paymentMethod)) {
    throw new CheckoutError("PAYMENT_METHOD_UNAVAILABLE", "That payment method isn't available yet.");
  }

  const address = await db.address.findFirst({ where: { id: input.addressId, userId: input.userId } });
  if (!address) throw new CheckoutError("ADDRESS_NOT_FOUND", "Choose a delivery address.");

  const cart = await getCart({ userId: input.userId });
  if (!cart.id || cart.lines.length === 0) throw new CheckoutError("EMPTY_CART", "Your cart is empty.");
  if (cart.hasUnavailable) {
    throw new CheckoutError("ITEMS_UNAVAILABLE", "Some items in your cart are no longer available. Review your cart.");
  }
  if (cart.totals.total !== input.expectedTotal) {
    throw new CheckoutError("PRICE_CHANGED", "Prices changed since you opened checkout. Please review your order.");
  }

  const online = input.paymentMethod !== "COD";
  const order = await db.$transaction(async (tx) => {
    for (const line of cart.lines) {
      // Conditional decrement: fails instead of overselling if someone bought it first.
      const reserved = await tx.offer.updateMany({
        where: { id: line.offerId, status: "ACTIVE", stock: { gte: line.quantity } },
        data: { stock: { decrement: line.quantity } },
      });
      if (reserved.count === 0) {
        throw new CheckoutError("OUT_OF_STOCK", `${line.productName} (${line.variantLabel}) just sold out.`);
      }
    }

    const created = await tx.order.create({
      data: {
        userId: input.userId,
        paymentMethod: input.paymentMethod,
        // Online orders hold their stock only while the buyer pays.
        paymentDueAt: online ? new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000) : null,
        subtotal: cart.totals.subtotal,
        shippingFee: cart.totals.shipping,
        total: cart.totals.total,
        shipName: address.fullName,
        shipPhone: address.phone,
        shipLine1: address.line1,
        shipLine2: address.line2,
        shipCity: address.city,
        shipProvince: address.province,
        sellerOrders: {
          create: cart.shipments.map((s) => {
            const subtotal = s.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
            return {
              sellerId: s.seller.id,
              subtotal,
              shippingFee: s.shipping,
              commission: commission(subtotal, s.seller.commissionBps),
              items: {
                create: s.lines.map((l) => ({
                  offerId: l.offerId,
                  productName: l.productName,
                  variantLabel: l.variantLabel,
                  unitPrice: l.price,
                  quantity: l.quantity,
                })),
              },
            };
          }),
        },
        // Online attempts are recorded when the buyer is sent to the gateway.
        ...(!online && { payments: { create: { method: input.paymentMethod, amount: cart.totals.total } } }),
      },
      select: { id: true, number: true, total: true, shipPhone: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id! } });
    return created;
  });

  // Online orders are confirmed by SMS once the payment arrives.
  if (!online) {
    await notify(
      order.shipPhone,
      `Trendz: order ${formatOrderNumber(order.number)} confirmed. Total ${formatPkr(order.total)}, pay cash on delivery.`,
    );
  }
  return order;
}

/**
 * Buyers can cancel until a seller confirms. Reserved stock goes back on sale.
 * `userId` limits it to that buyer's orders; pass null when an admin cancels.
 */
export async function cancelOrder(userId: string | null, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, ...(userId !== null && { userId }) },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      shipPhone: true,
      sellerOrders: { select: { status: true, items: { select: { offerId: true, quantity: true } } } },
    },
  });
  if (!order) throw new CheckoutError("NOT_FOUND", "Order not found.");
  if (order.status !== "PENDING" || order.sellerOrders.some((s) => s.status !== "PENDING")) {
    throw new CheckoutError("NOT_CANCELLABLE", "This order can no longer be cancelled. Contact support for a return.");
  }

  // Paid by card: refund through the gateway first, so we never cancel without returning the money.
  let refunded = false;
  if (await isPaidOnline(orderId)) {
    try {
      refunded = Boolean(await refundOnlinePayment(orderId, order.total));
    } catch (e) {
      if (e instanceof PaymentGatewayError) {
        console.error("[orders] refund failed", e);
        throw new CheckoutError("NOT_CANCELLABLE", "We couldn't refund your card just now, so the order wasn't cancelled. Please try again shortly.");
      }
      throw e;
    }
  }

  await db.$transaction(async (tx) => {
    for (const item of order.sellerOrders.flatMap((s) => s.items)) {
      await tx.offer.update({ where: { id: item.offerId }, data: { stock: { increment: item.quantity } } });
    }
    await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: "CANCELLED" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });

  await notify(
    order.shipPhone,
    `Trendz: order ${formatOrderNumber(order.number)} has been cancelled.${refunded ? ` We've refunded ${formatPkr(order.total)} to your card.` : ""}`,
  );
}

async function notify(phone: string, message: string) {
  try {
    await sendSms(phone, message);
  } catch (e) {
    // The order is already saved; a failed SMS must not fail the request.
    console.error("[notify] SMS failed", e);
  }
}

const orderDetailSelect = {
  id: true,
  number: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentDueAt: true,
  subtotal: true,
  shippingFee: true,
  total: true,
  shipName: true,
  shipPhone: true,
  shipLine1: true,
  shipLine2: true,
  shipCity: true,
  shipProvince: true,
  createdAt: true,
  sellerOrders: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      status: true,
      subtotal: true,
      shippingFee: true,
      courier: true,
      trackingNumber: true,
      shippedAt: true,
      deliveredAt: true,
      seller: { select: { shopName: true, city: true } },
      items: {
        select: {
          id: true,
          productName: true,
          variantLabel: true,
          unitPrice: true,
          quantity: true,
          offer: { select: { variant: { select: { product: { select: { slug: true } } } } } },
          returnRequests: {
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, reason: true, resolution: true, refundAmount: true },
          },
        },
      },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderDetail = Prisma.OrderGetPayload<{ select: typeof orderDetailSelect }>;

export function getOrder(userId: string, orderId: string) {
  return db.order.findFirst({ where: { id: orderId, userId }, select: orderDetailSelect });
}

export function getOrders(userId: string) {
  return db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
      createdAt: true,
      sellerOrders: { select: { items: { select: { productName: true, quantity: true } } } },
    },
  });
}

export const isCancellable = (order: { status: string; sellerOrders: { status: string }[] }) =>
  order.status === "PENDING" && order.sellerOrders.every((s) => s.status === "PENDING");
