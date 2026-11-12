"use client";

import { BanknoteIcon, ShieldCheckIcon, ShoppingBagIcon, Undo2Icon } from "lucide-react";
import Link from "@/components/i18n/link";
import { CartLines, OrderSummaryRows } from "@/components/cart/cart-lines";
import { useCartView } from "@/components/cart/use-cart-view";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

export function CartContent() {
  const { t } = useI18n();
  const { cart, loading, failed, items } = useCartView();

  if (loading && !cart) return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  if (failed && !cart) return <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{t.checkout.unavailable}</p>;

  if (!cart || items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-20 text-center">
        <ShoppingBagIcon className="size-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-semibold">{t.cart.emptyTitle}</p>
        <p className="mt-1 text-muted-foreground">{t.cart.emptyText}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/deals">{t.cart.browseDeals}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <CartLines cart={cart} t={t} />

      <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border p-5">
          <h2 className="mb-4 font-bold">{t.cart.summary(cart.itemCount)}</h2>
          <OrderSummaryRows t={t} {...cart.totals} />
          {cart.hasUnavailable ? (
            <p className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{t.cart.fixItems}</p>
          ) : (
            <Button asChild size="lg" className="mt-5 h-12 w-full text-base">
              <Link href="/checkout">{t.cart.checkout}</Link>
            </Button>
          )}
        </div>
        <ul className="space-y-2 rounded-2xl bg-secondary p-5 text-sm">
          <li className="flex items-center gap-2">
            <BanknoteIcon className="size-4 text-primary" /> {t.cart.payCod}
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-primary" /> {t.cart.warrantyAll(site.warrantyMonths)}
          </li>
          <li className="flex items-center gap-2">
            <Undo2Icon className="size-4 text-primary" /> {t.common.dayReturns(site.returnDays)}
          </li>
        </ul>
      </aside>
    </div>
  );
}
