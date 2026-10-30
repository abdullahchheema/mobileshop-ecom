import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { PageHeader } from "@/components/console/console-shell";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { getPayoutCandidates } from "@/lib/payouts";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Dashboard · Admin", robots: { index: false } };

export default function AdminDashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="The marketplace at a glance." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  await requireAdmin("/admin");
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [gmv, ordersToday, lateConfirmations, pendingSellers, openReturns, candidates, recent] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.count({ where: { createdAt: { gte: dayAgo } } }),
    db.sellerOrder.count({ where: { status: "PENDING", order: { createdAt: { lt: dayAgo } } } }),
    db.seller.count({ where: { status: "PENDING" } }),
    db.returnRequest.count({ where: { status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
    getPayoutCandidates(now),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, number: true, status: true, total: true, createdAt: true, shipName: true, shipCity: true },
    }),
  ]);
  const payoutsDue = candidates.reduce((n, c) => n + c.eligibleAmount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Sales, last 30 days" value={formatPkr(gmv._sum.total ?? 0)} note={`${gmv._count._all} orders`} href="/admin/orders" />
        <Stat label="Orders, last 24 hours" value={ordersToday} href="/admin/orders" />
        <Stat
          label="Sellers late to confirm"
          value={lateConfirmations}
          note="Pending for more than 24 hours"
          href="/admin/orders?status=PENDING"
          alert={lateConfirmations > 0}
        />
        <Stat label="Seller applications" value={pendingSellers} href="/admin/sellers" alert={pendingSellers > 0} />
        <Stat label="Open returns" value={openReturns} href="/admin/returns" alert={openReturns > 0} />
        <Stat label="Payouts ready" value={formatPkr(payoutsDue)} note={(() => {
            const n = candidates.filter((c) => c.eligibleCount).length;
            return `${n} ${n === 1 ? "seller" : "sellers"}`;
          })()} href="/admin/payouts" />
      </div>

      <section className="rounded-2xl border bg-background">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold">Latest orders</h2>
          <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            All orders
          </Link>
        </div>
        <ul className="divide-y">
          {recent.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm hover:bg-secondary/50">
                <span className="font-semibold">{formatOrderNumber(o.number)}</span>
                <OrderStatusBadge status={o.status} />
                <span className="text-muted-foreground">
                  {o.shipName}, {o.shipCity} · {formatDate(o.createdAt)}
                </span>
                <span className="ml-auto font-semibold">{formatPkr(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  href,
  alert,
}: {
  label: string;
  value: string | number;
  note?: string;
  href: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 transition hover:border-primary/40 ${alert ? "border-mango bg-mango/30" : "bg-background"}`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{note}</span>
        <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}
