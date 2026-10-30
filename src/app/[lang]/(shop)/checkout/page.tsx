import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AddressLines } from "@/components/account/address-card";
import { CartShipments, OrderSummaryRows } from "@/components/cart/cart-lines";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { type Lang, localizePath } from "@/i18n/config";
import { getDict, langOf } from "@/i18n";
import { listAddresses } from "@/lib/addresses";
import { getCart } from "@/lib/cart";
import { getCheckoutProvider } from "@/lib/payments";
import { PAYMENT_WINDOW_MINUTES } from "@/lib/payments/service";
import { requireSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ label: t.cart.title, href: "/cart" }, { label: t.checkout.title }]} />
      <h1 className="text-3xl font-semibold tracking-tight">{t.checkout.title}</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-secondary" />}>
        <Checkout lang={lang} />
      </Suspense>
    </div>
  );
}

async function Checkout({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const { user } = await requireSession(localizePath("/checkout", lang));
  const [cart, addresses] = await Promise.all([getCart({ userId: user.id }), listAddresses(user.id)]);
  const provider = getCheckoutProvider();
  if (cart.lines.length === 0 || cart.hasUnavailable) redirect(localizePath("/cart", lang));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <CheckoutForm
        total={cart.totals.total}
        card={provider ? { label: lang === "en" ? provider.label : t.checkout.card, windowMinutes: PAYMENT_WINDOW_MINUTES } : null}
        addresses={addresses.map((a) => ({ id: a.id, isDefault: a.isDefault, lines: <AddressLines address={a} t={t} /> }))}
      >
        <CartShipments cart={cart} lang={lang} editable={false} />
      </CheckoutForm>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border p-5">
          <h2 className="mb-4 font-bold">{t.checkout.summary}</h2>
          <OrderSummaryRows t={t} {...cart.totals} />
        </div>
      </aside>
    </div>
  );
}
