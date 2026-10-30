// Rules for a seller's part of an order (SellerOrder). Pure functions so the
// web, the API and tests all agree on what can happen next.

export type FulfillmentStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PARTIALLY_SHIPPED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED";
export type FulfillmentAction = "confirm" | "ship" | "deliver" | "cancel";

const ALLOWED: Record<FulfillmentStatus, FulfillmentAction[]> = {
  PENDING: ["confirm", "cancel"],
  CONFIRMED: ["ship", "cancel"],
  SHIPPED: ["deliver"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

export const RESULT_OF: Record<FulfillmentAction, FulfillmentStatus> = {
  confirm: "CONFIRMED",
  ship: "SHIPPED",
  deliver: "DELIVERED",
  cancel: "CANCELLED",
};

export const allowedActions = (status: FulfillmentStatus) => ALLOWED[status];
export const canApply = (status: FulfillmentStatus, action: FulfillmentAction) => ALLOWED[status].includes(action);

/** The buyer-facing order status, derived from every seller's shipment. */
export function rollupOrderStatus(statuses: FulfillmentStatus[]): OrderStatus {
  const live = statuses.filter((s) => s !== "CANCELLED" && s !== "RETURNED");
  if (live.length === 0) return statuses.includes("RETURNED") ? "RETURNED" : "CANCELLED";
  if (live.every((s) => s === "DELIVERED")) return "DELIVERED";
  const moving = live.filter((s) => s === "SHIPPED" || s === "DELIVERED").length;
  if (moving === live.length) return "SHIPPED";
  if (moving > 0) return "PARTIALLY_SHIPPED";
  if (live.every((s) => s === "CONFIRMED")) return "CONFIRMED";
  return "PENDING";
}

/** What the platform owes a seller for a delivered shipment. */
export const sellerEarning = (o: { subtotal: number; shippingFee: number; commission: number }) =>
  o.subtotal + o.shippingFee - o.commission;

export const COURIERS = ["TCS", "Leopards", "M&P", "PostEx", "Trax", "Call Courier", "BlueEx"] as const;
