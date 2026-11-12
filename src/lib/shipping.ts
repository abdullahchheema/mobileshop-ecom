// Delivery fee. One store ships the whole order, so there is one fee per order. The ERP receives it as `delivery_fee`
// and re-checks the total against what the customer saw.

export const SHIPPING_FEE = 250;
/** An order ships free once its items reach this amount. */
export const FREE_SHIPPING_FROM = 30000;

export function shipmentFee(subtotal: number) {
  return subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}
