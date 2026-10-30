import Link from "@/components/i18n/link";
import { TriangleAlertIcon, TruckIcon } from "lucide-react";
import { CartLineControls } from "@/components/cart/cart-line-controls";
import { DeviceArt } from "@/components/product/device-art";
import type { CartView } from "@/lib/cart";
import { FREE_SHIPPING_FROM } from "@/lib/shipping";
import type { Lang } from "@/i18n/config";
import { type Dict, getDict, variantLabelFor } from "@/i18n";
import { formatPkr } from "@/lib/site";

/** Cart contents, one card per seller shipment. `editable` adds quantity/remove controls. */
export function CartShipments({ cart, lang, editable = true }: { cart: CartView; lang: Lang; editable?: boolean }) {
  const t = getDict(lang);
  return (
    <div className="space-y-4">
      {cart.shipments.map((shipment, i) => (
        <section key={shipment.seller.id} className="rounded-2xl border">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/50 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <TruckIcon className="size-4 text-primary" />
              {t.cart.shipment(i + 1, cart.shipments.length, shipment.seller.name, shipment.seller.city)}
            </p>
            <p className="text-muted-foreground">
              {shipment.shipping === 0 ? t.cart.freeDelivery : t.cart.deliveryFee(formatPkr(shipment.shipping))}
            </p>
          </header>
          <ul className="divide-y">
            {shipment.lines.map((line) => (
              <li key={line.id} className="flex gap-4 p-4">
                <Link href={line.href} className="size-20 shrink-0 rounded-xl bg-secondary p-2 sm:size-24">
                  <DeviceArt kind={line.kind} color={line.colorHex} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-4">
                    <Link href={line.href} className="font-semibold hover:text-primary hover:underline">
                      {line.productName}
                    </Link>
                    <p className="font-bold whitespace-nowrap">{formatPkr(line.price * line.quantity)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{variantLabelFor(t, line.variantLabel)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.common.monthWarranty(line.warrantyMonths)}
                    {line.quantity > 1 && ` · ${t.cart.each(formatPkr(line.price))}`}
                    {!editable && ` · ${t.common.qty(line.quantity)}`}
                  </p>
                  {!line.available && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <TriangleAlertIcon className="size-4" />
                      {line.stock > 0 ? t.cart.onlyLeft(line.stock) : t.cart.noLonger}
                    </p>
                  )}
                  {editable && (
                    <div className="mt-1">
                      <CartLineControls
                        itemId={line.id}
                        quantity={line.quantity}
                        maxQuantity={line.maxQuantity}
                        available={line.available || line.stock > 0}
                      />
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function OrderSummaryRows({
  t = getDict("en"),
  subtotal,
  shipping,
  total,
}: {
  t?: Dict;
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t.common.subtotal}</dt>
        <dd>{formatPkr(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{t.common.delivery}</dt>
        <dd>{shipping === 0 ? t.common.free : formatPkr(shipping)}</dd>
      </div>
      <div className="flex justify-between border-t pt-3 text-base font-bold">
        <dt>{t.common.total}</dt>
        <dd>{formatPkr(total)}</dd>
      </div>
      <p className="pt-1 text-xs text-muted-foreground">{t.cart.freeFrom(formatPkr(FREE_SHIPPING_FROM))}</p>
    </dl>
  );
}
