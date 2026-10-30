import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { PageHeader } from "@/components/console/console-shell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { ADMIN_ORDER_TABS, listAdminOrders } from "@/lib/admin-orders";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders · Admin", robots: { index: false } };

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" description="Every order on the marketplace, across all sellers." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Orders {...props} />
      </Suspense>
    </>
  );
}

async function Orders({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("/admin/orders");
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const status = ADMIN_ORDER_TABS.find((t) => t.status === one(params.status))?.status ?? "ALL";
  const q = one(params.q)?.trim() || undefined;
  const page = Math.max(1, Number(one(params.page)) || 1);
  const { orders, total, pageCount } = await listAdminOrders({ status, q, page });
  const href = (changes: Record<string, string>) =>
    `/admin/orders?${new URLSearchParams({ ...(status !== "ALL" && { status }), ...(q && { q }), ...changes })}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form action="/admin/orders" className="relative min-w-64 flex-1">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Order number, buyer name or phone"
            className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm"
          />
        </form>
      </div>
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-background p-1 scrollbar-none" aria-label="Order status">
        {ADMIN_ORDER_TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/orders?${new URLSearchParams({ ...(t.status !== "ALL" && { status: t.status }), ...(q && { q }) })}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              t.status === status ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{total} orders</p>

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-background p-12 text-center text-muted-foreground">No orders found.</p>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-secondary/50">
                <span className="font-semibold">{formatOrderNumber(o.number)}</span>
                <OrderStatusBadge status={o.status} />
                <span className="text-muted-foreground">
                  {o.shipName}, {o.shipCity} · {formatDate(o.createdAt)} · {o._count.sellerOrders}{" "}
                  {o._count.sellerOrders === 1 ? "seller" : "sellers"} · {PAYMENT_METHOD_LABEL[o.paymentMethod]}
                  {o.paymentStatus !== "UNPAID" && ` (${o.paymentStatus.toLowerCase()})`}
                </span>
                <span className="ml-auto font-semibold">{formatPkr(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav className="flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={href({ page: String(page - 1) })}>Previous</Link>
            </Button>
          )}
          {page < pageCount && (
            <Button asChild variant="outline">
              <Link href={href({ page: String(page + 1) })}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
