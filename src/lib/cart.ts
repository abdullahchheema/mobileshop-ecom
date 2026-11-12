// Cart view logic. The cart itself lives in the browser (cart-store.ts) and holds only variant keys and quantities;
// everything shown or sent to the ERP (price, stock, name) is looked up fresh from the ERP's catalogue views.
import { shipmentFee } from "@/lib/shipping";

export const MAX_PER_LINE = 5;
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

export const clampQuantity = (qty: number) => Math.min(MAX_PER_LINE, Math.max(1, Math.floor(Number.isFinite(qty) ? qty : 1)));

export function buildCartView(items: CartItem[], current: Map<string, CurrentVariant>): CartView {
  const lines: CartLineView[] = items.map(({ key, qty }) => {
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
  const subtotal = buyable.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const shipping = subtotal > 0 ? shipmentFee(subtotal) : 0;
  return {
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    hasUnavailable: lines.some((l) => !l.available),
    totals: { subtotal, shipping, total: subtotal + shipping },
  };
}
