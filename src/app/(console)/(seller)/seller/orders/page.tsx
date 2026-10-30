import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { PageHeader } from "@/components/console/console-shell";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { listSellerOrders, SELLER_ORDER_TABS } from "@/lib/seller-orders";
import { requireSeller } from "@/lib/sellers";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders · Seller hub", robots: { index: false } };

export default function SellerOrdersPage(props: PageProps<"/seller/orders">) {
  return (
    <>
      <PageHeader title="Orders" description="Confirm new orders within 1 working day and ship within 2." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Orders {...props} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: PageProps<"/seller/orders">) {
  const { seller } = await requireSeller("/seller/orders");
  const { status: raw } = await searchParams;
  const status = SELLER_ORDER_TABS.find((t) => t.status === raw)?.status ?? "PENDING";
  const { counts, orders } = await listSellerOrders(seller.id, status);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-background p-1 scrollbar-none" aria-label="Order status">
        {SELLER_ORDER_TABS.map((t) => (
          <Link
            key={t.status}
            href={`/seller/orders?status=${t.status}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              t.status === status ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {t.label}
            {(counts[t.status] ?? 0) > 0 && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 text-xs",
                  (t.status === "PENDING" || t.status === "CONFIRMED") && "bg-primary text-primary-foreground",
                )}
              >
                {counts[t.status]}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-background p-12 text-center text-muted-foreground">Nothing here right now.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/seller/orders/${o.id}`} className="flex items-center gap-4 p-4 hover:bg-secondary/50">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {formatOrderNumber(o.order.number)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {formatDate(o.order.createdAt)} · {o.order.shipCity} · {PAYMENT_METHOD_LABEL[o.order.paymentMethod]}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {o.items.map((i) => `${i.quantity} × ${i.productName} (${i.variantLabel})`).join(", ")}
                  </p>
                </div>
                <p className="font-bold whitespace-nowrap">{formatPkr(o.subtotal)}</p>
                <ChevronRightIcon className="size-5 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
