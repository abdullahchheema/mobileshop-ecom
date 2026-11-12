import Image from "next/image";
import Link from "@/components/i18n/link";
import { TriangleAlertIcon } from "lucide-react";
import { CartLineControls } from "@/components/cart/cart-line-controls";
import { DeviceArt } from "@/components/product/device-art";
import type { CartView } from "@/lib/cart";
import { FREE_SHIPPING_FROM } from "@/lib/shipping";
import { type Dict, getDict } from "@/i18n";
import { formatPkr } from "@/lib/site";

/** Cart contents. `editable` adds quantity and remove controls. */
export function CartLines({ cart, t, editable = true }: { cart: CartView; t: Dict; editable?: boolean }) {
  return (
    <section className="rounded-2xl border">
      <ul className="divide-y">
        {cart.lines.map((line) => (
          <li key={line.key} className="flex gap-4 p-4">
            <Link href={line.href} className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-secondary p-2 sm:size-24">
              {line.image ? <Image src={line.image} alt="" fill sizes="96px" className="object-contain p-1" /> : <DeviceArt kind={line.kind} />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-start justify-between gap-x-4">
                <Link href={line.href} className="font-semibold hover:text-primary hover:underline">
                  {line.name}
                </Link>
                <p className="font-bold whitespace-nowrap">{line.available ? formatPkr(line.price * line.quantity) : ""}</p>
              </div>
              <p className="text-sm text-muted-foreground">{line.label}</p>
              {line.warrantyMonths > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t.common.monthWarranty(line.warrantyMonths)}
                  {line.quantity > 1 && line.available && ` · ${t.cart.each(formatPkr(line.price))}`}
                  {!editable && ` · ${t.common.qty(line.quantity)}`}
                </p>
              )}
              {!line.available && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <TriangleAlertIcon className="size-4" />
                  {line.stock > 0 ? t.cart.onlyLeft(line.stock) : t.cart.noLonger}
                </p>
              )}
              {editable && (
                <div className="mt-1">
                  <CartLineControls itemKey={line.key} quantity={line.quantity} maxQuantity={line.maxQuantity} available={line.available || line.stock > 0} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderSummaryRows({ t = getDict("en"), subtotal, shipping, total }: { t?: Dict; subtotal: number; shipping: number; total: number }) {
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
