import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { getDict, langOf } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/checkout">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: PageProps<"/[lang]/checkout">) {
  const t = getDict(await langOf(params));
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ label: t.cart.title, href: "/cart" }, { label: t.checkout.title }]} />
      <h1 className="text-3xl font-semibold tracking-tight">{t.checkout.title}</h1>
      <CheckoutView />
    </div>
  );
}
