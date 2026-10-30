import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatOrderNumber } from "@/lib/order-number";
import { getCheckoutProvider, providerById } from "@/lib/payments";
import { PaymentGatewayError, type PaymentState } from "@/lib/payments/types";
import { formatPkr, site } from "@/lib/site";
import { sendSms } from "@/lib/sms";

/** How long a buyer has to complete an online payment before the order is released. */
export const PAYMENT_WINDOW_MINUTES = 30;

export class PaymentError extends Error {}

/** Keeps what's already stored for a payment (e.g. the gateway's session) and adds the latest event. */
function withEvent(existing: unknown, event: unknown) {
  const base = existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  return { ...base, lastEvent: event } as Prisma.InputJsonValue;
}

async function markAttemptFailed(providerId: string, ref: string, event: unknown) {
  const attempt = await db.payment.findFirst({
    where: { provider: providerId, providerRef: ref, status: "UNPAID" },
    select: { id: true, raw: true },
  });
  if (attempt) await db.payment.update({ where: { id: attempt.id }, data: { status: "FAILED", raw: withEvent(attempt.raw, event) } });
}

async function notify(phone: string, message: string) {
  try {
    await sendSms(phone, message);
  } catch (e) {
    console.error("[notify] SMS failed", e);
  }
}

/** Starts (or retries) the online payment for an unpaid order. Returns the gateway URL. */
export async function startOnlinePayment(userId: string, orderId: string) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, number: true, total: true, status: true, paymentMethod: true, paymentStatus: true, paymentDueAt: true },
  });
  if (!order) throw new PaymentError("Order not found.");
  if (order.paymentMethod === "COD") throw new PaymentError("This order is paid in cash on delivery.");
  if (order.paymentStatus === "PAID") throw new PaymentError("This order is already paid.");
  if (order.status === "CANCELLED" || (order.paymentDueAt && order.paymentDueAt < new Date())) {
    throw new PaymentError("The time to pay for this order has run out, so it was cancelled. Please order again.");
  }
  const provider = getCheckoutProvider();
  if (!provider) throw new PaymentError("Online payment isn't available right now. Please choose cash on delivery.");

  // Safepay appends ?tracker=… to this URL, so it must not have its own query string.
  const session = await provider.createCheckout({
    orderId: order.id,
    orderNumber: order.number,
    amount: order.total,
    returnUrl: `${site.url}/payment/return/${order.id}`,
    cancelUrl: `${site.url}/payment/return/${order.id}?cancelled=1`,
  });
  await db.payment.create({
    data: {
      orderId: order.id,
      method: order.paymentMethod,
      provider: provider.id,
      providerRef: session.ref,
      amount: order.total,
      raw: (session.raw ?? null) as Prisma.InputJsonValue,
    },
  });
  return session.redirectUrl;
}

export type MarkPaidResult = "paid" | "already_paid" | "unknown_payment" | "amount_mismatch" | "refunded_late";

/**
 * Records a successful payment. Safe to call more than once for the same payment
 * (redirect, webhook and status check can all arrive). If the order was already
 * cancelled because the payment window ran out, the money is refunded instead.
 */
export async function markPaymentPaid(
  providerId: string,
  ref: string,
  evidence: { amount?: number; currency?: string; raw: unknown },
): Promise<MarkPaidResult> {
  const payment = await db.payment.findFirst({
    where: { provider: providerId, providerRef: ref },
    select: {
      id: true,
      amount: true,
      status: true,
      raw: true,
      order: { select: { id: true, number: true, status: true, total: true, shipPhone: true } },
    },
  });
  if (!payment) return "unknown_payment";
  if (payment.status === "PAID" || payment.status === "REFUNDED") return "already_paid";
  if (
    (evidence.amount !== undefined && evidence.amount !== payment.amount) ||
    (evidence.currency !== undefined && evidence.currency !== "PKR")
  ) {
    console.error("[payments] amount/currency mismatch", { ref, expected: payment.amount, evidence });
    await db.payment.update({ where: { id: payment.id }, data: { raw: withEvent(payment.raw, evidence.raw) } });
    return "amount_mismatch";
  }

  // Conditional update: only one concurrent caller gets to flip it to PAID.
  const claimed = await db.payment.updateMany({
    where: { id: payment.id, status: { in: ["UNPAID", "FAILED"] } },
    data: { status: "PAID", raw: withEvent(payment.raw, evidence.raw) },
  });
  if (claimed.count === 0) return "already_paid";

  const number = formatOrderNumber(payment.order.number);
  if (payment.order.status === "CANCELLED") {
    // Paid after the window closed and the stock was released: give the money back.
    await refundPayment(payment.id, payment.amount);
    await notify(
      payment.order.shipPhone,
      `Trendz: your payment for ${number} arrived after the order had expired, so we've refunded ${formatPkr(payment.amount)}.`,
    );
    return "refunded_late";
  }

  await db.order.update({ where: { id: payment.order.id }, data: { paymentStatus: "PAID", paymentDueAt: null } });
  await notify(payment.order.shipPhone, `Trendz: payment of ${formatPkr(payment.amount)} received. Order ${number} is confirmed.`);
  return "paid";
}

/** Asks the gateway about one attempt and records the outcome. */
export async function syncPaymentState(providerId: string, ref: string): Promise<PaymentState> {
  const provider = providerById(providerId);
  if (!provider) return "failed";
  const state = await provider.fetchState(ref);
  if (state === "paid") await markPaymentPaid(providerId, ref, { raw: { source: "status-check", state } });
  if (state === "failed") await markAttemptFailed(providerId, ref, { source: "status-check", state });
  return state;
}

/** Verifies and applies a gateway webhook. Returns the HTTP status to answer with. */
export async function handlePaymentWebhook(providerId: string, rawBody: string, headers: Headers) {
  const provider = providerById(providerId);
  if (!provider) return 404;
  let event;
  try {
    event = provider.parseWebhook(rawBody, headers);
  } catch (e) {
    console.error("[payments] unreadable webhook", e);
    return 400;
  }
  if (!event) return 401;

  if (event.kind === "paid") {
    const result = await markPaymentPaid(provider.id, event.ref, { amount: event.amount, currency: event.currency, raw: event.raw });
    if (result === "unknown_payment") console.warn("[payments] webhook for unknown payment", event.ref);
  } else if (event.kind === "failed") {
    await markAttemptFailed(provider.id, event.ref, event.raw);
  }
  return 200;
}

async function refundPayment(paymentId: string, amount: number) {
  const payment = await db.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: { provider: true, providerRef: true, amount: true, refundedAmount: true, orderId: true },
  });
  const provider = providerById(payment.provider);
  if (!provider || !payment.providerRef) throw new PaymentGatewayError("This payment can't be refunded automatically.");

  const refundable = payment.amount - payment.refundedAmount;
  const toRefund = Math.min(amount, refundable);
  if (toRefund <= 0) return null;

  const { refundRef } = await provider.refund(payment.providerRef, toRefund);
  const refundedAmount = payment.refundedAmount + toRefund;
  const full = refundedAmount >= payment.amount;
  await db.payment.update({
    where: { id: paymentId },
    data: { refundedAmount, ...(full && { status: "REFUNDED" }) },
  });
  if (full) await db.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "REFUNDED" } });
  return refundRef;
}

/**
 * Refunds part or all of an order paid online, through the gateway that took the
 * money. Returns the refund reference, or null if the order wasn't paid online
 * (cash on delivery refunds are sent by hand and recorded by an admin).
 */
export async function refundOnlinePayment(orderId: string, amount: number) {
  const payment = await db.payment.findFirst({
    where: { orderId, provider: { not: null }, status: { in: ["PAID", "REFUNDED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!payment) return null;
  return refundPayment(payment.id, amount);
}

export async function isPaidOnline(orderId: string) {
  const paid = await db.payment.count({ where: { orderId, provider: { not: null }, status: { in: ["PAID", "REFUNDED"] } } });
  return paid > 0;
}

/**
 * Cancels online orders whose payment window has passed, putting their stock
 * back on sale. Checks the gateway one last time first, in case a webhook is late.
 */
export async function expireUnpaidOrders(cancel: (orderId: string) => Promise<void>, now = new Date()) {
  const overdue = await db.order.findMany({
    where: { paymentMethod: { not: "COD" }, paymentStatus: "UNPAID", status: "PENDING", paymentDueAt: { lt: now } },
    select: { id: true, payments: { where: { provider: { not: null } }, select: { provider: true, providerRef: true } } },
  });

  let expired = 0;
  for (const order of overdue) {
    let paid = false;
    for (const p of order.payments) {
      if (!p.provider || !p.providerRef) continue;
      try {
        if ((await syncPaymentState(p.provider, p.providerRef)) === "paid") paid = true;
      } catch (e) {
        console.error("[payments] status check failed during expiry", e);
      }
    }
    if (!paid) {
      await cancel(order.id);
      expired++;
    }
  }
  return { checked: overdue.length, expired };
}
