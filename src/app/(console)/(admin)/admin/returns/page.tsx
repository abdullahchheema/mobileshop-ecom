import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ReturnActions } from "@/components/admin/return-actions";
import { PageHeader } from "@/components/console/console-shell";
import { requireAdmin } from "@/lib/admin";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { countReturnsByStatus, listReturns } from "@/lib/return-requests";
import type { ReturnStatus } from "@/lib/returns";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Returns · Admin", robots: { index: false } };

const TABS: { status: ReturnStatus; label: string }[] = [
  { status: "REQUESTED", label: "New" },
  { status: "APPROVED", label: "Awaiting device" },
  { status: "RECEIVED", label: "To refund" },
  { status: "REFUNDED", label: "Refunded" },
  { status: "REJECTED", label: "Rejected" },
];

export default function ReturnsPage(props: PageProps<"/admin/returns">) {
  return (
    <>
      <PageHeader
        title="Returns"
        description="Approve, collect, then refund. Refunds are paid by bank or wallet transfer and come off the seller's payout."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Returns {...props} />
      </Suspense>
    </>
  );
}

async function Returns({ searchParams }: PageProps<"/admin/returns">) {
  await requireAdmin("/admin/returns");
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? "REQUESTED";
  const [counts, returns] = await Promise.all([countReturnsByStatus(), listReturns(status)]);

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-background p-1 scrollbar-none" aria-label="Return status">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/returns?status=${t.status}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              t.status === status ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {t.label} <span className="ml-1 text-xs">({counts[t.status] ?? 0})</span>
          </Link>
        ))}
      </nav>

      {returns.length === 0 ? (
        <p className="rounded-2xl bg-background p-12 text-center text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="space-y-3">
          {returns.map((r) => {
            const item = r.orderItem;
            const { order, seller } = item.sellerOrder;
            const amount = item.unitPrice * item.quantity;
            return (
              <li key={r.id} className="space-y-3 rounded-2xl border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {item.productName} <span className="font-normal text-muted-foreground">· {item.variantLabel} · Qty {item.quantity}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                        {formatOrderNumber(order.number)}
                      </Link>{" "}
                      · {order.shipName}, {order.shipCity} · {order.shipPhone} · paid by {PAYMENT_METHOD_LABEL[order.paymentMethod]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sold by {seller.shopName}, {seller.city} · requested {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <p className="font-bold">{formatPkr(amount)}</p>
                </div>
                <div className="rounded-xl border p-3 text-sm">
                  <p className="font-medium">{r.reason}</p>
                  {r.details && <p className="mt-1 text-muted-foreground">&ldquo;{r.details}&rdquo;</p>}
                  {r.resolution && <p className="mt-1 text-muted-foreground">Note: {r.resolution}</p>}
                  {r.refundRef && <p className="mt-1 text-muted-foreground">Refund ref: {r.refundRef}</p>}
                </div>
                <ReturnActions id={r.id} status={r.status} refundAmount={amount} cardRefund={order.paymentMethod !== "COD"} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
