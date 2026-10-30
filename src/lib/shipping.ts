// Delivery fees and commission. Each seller ships separately, so fees are per
// seller shipment. Pure functions: used by the cart, checkout and order creation.

export const SHIPPING_FEE = 250;
/** A seller's shipment ships free once its items reach this amount. */
export const FREE_SHIPPING_FROM = 30000;

export function shipmentFee(sellerSubtotal: number) {
  return sellerSubtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

export type ShipmentInput = { sellerId: string; lines: { price: number; quantity: number }[] };

export function orderTotals(shipments: ShipmentInput[]) {
  const perSeller = shipments.map((s) => {
    const subtotal = s.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
    return { sellerId: s.sellerId, subtotal, shipping: shipmentFee(subtotal) };
  });
  const subtotal = perSeller.reduce((sum, s) => sum + s.subtotal, 0);
  const shipping = perSeller.reduce((sum, s) => sum + s.shipping, 0);
  return { perSeller, subtotal, shipping, total: subtotal + shipping };
}

/** Platform commission on a seller's subtotal, in whole rupees. */
export function commission(subtotal: number, commissionBps: number) {
  return Math.round((subtotal * commissionBps) / 10000);
}
