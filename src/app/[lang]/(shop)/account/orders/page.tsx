import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { Button } from "@/components/ui/button";
import { type Lang, localizePath } from "@/i18n/config";
import { formatDateFor, getDict, langOf } from "@/i18n";
import { formatOrderNumber, getOrders } from "@/lib/orders";
import { requireSession } from "@/lib/session";
import { formatPkr } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/orders">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).orders.title, robots: { index: false } };
}

export default async function OrdersPage({ params }: PageProps<"/[lang]/account/orders">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ label: t.account.myAccount, href: "/account" }, { label: t.orders.orders }]} />
      <h1 className="text-3xl font-semibold tracking-tight">{t.orders.title}</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-secondary" />}>
        <Orders lang={lang} />
      </Suspense>
    </div>
  );
}

async function Orders({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const { user } = await requireSession(localizePath("/account/orders", lang));
  const orders = await getOrders(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed px-6 py-16 text-center">
        <PackageIcon className="size-10 text-muted-foreground" />
        <p className="mt-4 font-semibold">{t.orders.noneTitle}</p>
        <Button asChild className="mt-6">
          <Link href="/deals">{t.orders.startShopping}</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const items = order.sellerOrders.flatMap((s) => s.items);
        const count = items.reduce((n, i) => n + i.quantity, 0);
        return (
          <li key={order.id}>
            <Link
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 rounded-2xl border p-5 transition hover:border-primary/40"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{formatOrderNumber(order.number)}</p>
                  <OrderStatusBadge status={order.status} t={t} />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {items.map((i) => i.productName).join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateFor(order.createdAt, lang)} · {t.common.items(count)}
                </p>
              </div>
              <p className="font-bold">{formatPkr(order.total)}</p>
              <ChevronRightIcon className="size-5 text-muted-foreground rtl:-scale-x-100" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
