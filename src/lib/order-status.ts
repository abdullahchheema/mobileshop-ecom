// Buyer-facing names for order and shipment states.

export const ORDER_STATUS: Record<string, { label: string; tone: "neutral" | "progress" | "success" | "danger" }> = {
  PENDING: { label: "Placed", tone: "neutral" },
  CONFIRMED: { label: "Confirmed", tone: "progress" },
  PARTIALLY_SHIPPED: { label: "Partly shipped", tone: "progress" },
  SHIPPED: { label: "Shipped", tone: "progress" },
  DELIVERED: { label: "Delivered", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  RETURNED: { label: "Returned", tone: "neutral" },
};

/** Happy path of one seller's shipment, in order. */
export const SHIPMENT_STEPS = [
  { status: "PENDING", label: "Order placed" },
  { status: "CONFIRMED", label: "Confirmed by seller" },
  { status: "SHIPPED", label: "On its way" },
  { status: "DELIVERED", label: "Delivered" },
] as const;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  COD: "Cash on delivery",
  CARD: "Card",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
};

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(date);
