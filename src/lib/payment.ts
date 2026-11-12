// The five payment methods the ERP accepts (see the integration guide). Only Cash on Delivery is collected at the door;
// the others are paid by the customer to the shop, which confirms the payment before dispatch. We never send
// payment_status: only the shop can mark an order Paid.
export const PAYMENT_METHODS = ["Cash on Delivery", "Bank Transfer", "Easypaisa", "JazzCash", "Card"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const isPrepaid = (m: string) => m !== "Cash on Delivery";
