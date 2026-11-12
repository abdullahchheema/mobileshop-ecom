import type { Metadata } from "next";
import { OrdersView } from "@/components/orders/orders-view";
import { getDict, langOf } from "@/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/orders">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).track.title, robots: { index: false } };
}

export default async function OrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const t = getDict(await langOf(params));
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t.track.title}</h1>
      <p className="text-muted-foreground">{t.track.hint}</p>
      <OrdersView />
    </div>
  );
}
