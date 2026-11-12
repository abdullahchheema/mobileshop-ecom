import type { Metadata } from "next";
import { CartContent } from "@/components/cart/cart-content";
import { getDict, langOf } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).cart.title, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const lang = await langOf(params);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{getDict(lang).cart.title}</h1>
      <CartContent />
    </div>
  );
}
