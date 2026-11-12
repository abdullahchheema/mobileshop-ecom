// Cart view logic. The cart itself lives in the browser (cart-store.ts) and holds only variant keys and quantities;
// everything shown or sent to the ERP (price, stock, name) is looked up fresh from the ERP's catalogue views.
import { shipmentFee } from "@/lib/shipping";

/** Delivery for a subtotal. The default is the store's usual fee; the server passes the ERP's configured pricing. */
export type ShippingFn = (subtotal: number) => number;

export const MAX_PER_LINE = 50; // capped again by the ERP's stock for each variant
export const MAX_LINES = 40; // the ERP accepts up to 40 lines per order

export type CartItem = { key: string; qty: number };

/** Current ERP data for one variant (from the web_variants view). */
export type CurrentVariant = {
  price: number;
  quantity: number;
  warrantyMonths: number;
  productId: string;
  condition: string | null;
  pta: string | null;
  type: string | null;
  name: string;
  slug: string;
  image: string | null;
  label: string;
  kind: string;
};

export type CartLineView = {
  key: string;
  name: string;
  href: string;
  image: string | null;
  kind: string;
  label: string;
  price: number;
  quantity: number;
  warrantyMonths: number;
  /** In stock for the wanted quantity. */
  available: boolean;
  /** How many the ERP currently has (0 when the variant is gone). */
  stock: number;
  maxQuantity: number;
};

export type CartView = {
  lines: CartLineView[];
  itemCount: number;
  hasUnavailable: boolean;
  totals: { subtotal: number; shipping: number; total: number };
};

/** Rupees as whole paisa. Money is added up in paisa so 89,999.10 x 3 is 269,997.30, never 269997.30000000005 (which the ERP would refuse as a third decimal). */
export const toPaisa = (rupees: number) => Math.round(rupees * 100);
export const fromPaisa = (paisa: number) => paisa / 100;
/** One amount cleaned of binary-float noise (two decimals at most). */
export const roundMoney = (rupees: number) => fromPaisa(toPaisa(rupees));

/** The same variant listed twice (a hand-edited or damaged saved cart) becomes one line with the quantities added, which is what the ERP requires. */
export function mergeItems(items: CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const { key, qty } of items) merged.set(key, (merged.get(key) ?? 0) + clampQuantity(qty));
  return [...merged].map(([key, qty]) => ({ key, qty: clampQuantity(qty) }));
}

export const clampQuantity = (qty: number) => Math.min(MAX_PER_LINE, Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1)));

export function buildCartView(items: CartItem[], current: Map<string, CurrentVariant>, shippingFor: ShippingFn = (n) => (n > 0 ? shipmentFee(n) : 0)): CartView {
  const lines: CartLineView[] = mergeItems(items).map(({ key, qty }) => {
    const v = current.get(key);
    const quantity = clampQuantity(qty);
    if (!v) {
      return { key, name: "Unavailable item", href: "/", image: null, kind: "smartphone", label: "", price: 0, quantity, warrantyMonths: 0, available: false, stock: 0, maxQuantity: 0 };
    }
    return {
      key,
      name: v.name,
      href: `/p/${v.slug}`,
      image: v.image,
      kind: v.kind,
      label: v.label,
      price: v.price,
      quantity,
      warrantyMonths: v.warrantyMonths,
      available: v.quantity >= quantity,
      stock: v.quantity,
      maxQuantity: Math.min(MAX_PER_LINE, v.quantity),
    };
  });
  const buyable = lines.filter((l) => l.available);
  const subtotal = fromPaisa(buyable.reduce((sum, l) => sum + toPaisa(l.price) * l.quantity, 0));
  const shipping = subtotal > 0 ? roundMoney(shippingFor(subtotal)) : 0;
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    hasUnavailable: lines.some((l) => !l.available),
    totals: { subtotal, shipping, total: fromPaisa(toPaisa(subtotal) + toPaisa(shipping)) },
  };
}
