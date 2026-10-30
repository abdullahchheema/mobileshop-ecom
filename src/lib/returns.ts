// Returns and payout eligibility. Pure functions shared by buyers, sellers and admins.

import { sellerEarning } from "@/lib/fulfillment";
import { site } from "@/lib/site";

export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "RECEIVED" | "REFUNDED";
export type ReturnAction = "approve" | "reject" | "receive" | "refund";

const DAY = 24 * 60 * 60 * 1000;
export const RETURN_WINDOW_DAYS = site.returnDays;

export const RETURN_REASONS = [
  "Not as described (condition, color or storage)",
  "Doesn't work properly",
  "Battery drains too fast",
  "Arrived damaged",
  "Changed my mind",
  "Other",
] as const;

const NEXT: Record<ReturnStatus, Partial<Record<ReturnAction, ReturnStatus>>> = {
  REQUESTED: { approve: "APPROVED", reject: "REJECTED" },
  APPROVED: { receive: "RECEIVED", reject: "REJECTED" },
  RECEIVED: { refund: "REFUNDED" },
  REJECTED: {},
  REFUNDED: {},
};

export const nextReturnStatus = (status: ReturnStatus, action: ReturnAction) => NEXT[status][action] ?? null;
export const returnActions = (status: ReturnStatus) => Object.keys(NEXT[status]) as ReturnAction[];

/** Still being handled: blocks payout for that shipment. */
export const isOpenReturn = (status: ReturnStatus) => status === "REQUESTED" || status === "APPROVED" || status === "RECEIVED";

export const returnDeadline = (deliveredAt: Date) => new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY);

export const canRequestReturn = (deliveredAt: Date | null, now: Date) =>
  deliveredAt !== null && now.getTime() <= returnDeadline(deliveredAt).getTime();

type ShipmentMoney = { subtotal: number; shippingFee: number; commission: number };

/**
 * What the seller is owed after refunds. Refunded items come off the seller's
 * share, and so does the matching part of the commission (Trendz refunds its cut too).
 */
export function earningAfterRefunds(shipment: ShipmentMoney, refunded: number) {
  if (refunded <= 0) return sellerEarning(shipment);
  const commissionBack = shipment.subtotal > 0 ? Math.round((shipment.commission * refunded) / shipment.subtotal) : 0;
  return Math.max(0, sellerEarning(shipment) - refunded + commissionBack);
}

/**
 * A delivered shipment can be paid out once the return window has closed and
 * no return is still open, so a refund can never claw back money already paid.
 */
export function payoutStatus(
  shipment: { status: string; deliveredAt: Date | null; payoutId: string | null },
  returnStatuses: ReturnStatus[],
  now: Date,
): "paid" | "eligible" | "on_hold" | "not_delivered" {
  if (shipment.payoutId) return "paid";
  if (shipment.status !== "DELIVERED" || !shipment.deliveredAt) return "not_delivered";
  if (returnStatuses.some(isOpenReturn)) return "on_hold";
  return now.getTime() > returnDeadline(shipment.deliveredAt).getTime() ? "eligible" : "on_hold";
}
