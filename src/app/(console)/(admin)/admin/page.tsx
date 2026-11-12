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
      <PageHeader title="Dashboard" description="The website at a glance. Orders, returns and listings are run from the ERP (E-commerce section)." />
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

  const [gmv, ordersToday, lateConfirmations, openReturns, candidates, recent] = await Promise.all([
    db.order.aggregate({ where: { createdAt: { gte: monthAgo }, status: { not: "CANCELLED" } }, _sum: { total: true }, _count: { _all: true } }),
    db.order.count({ where: { createdAt: { gte: dayAgo } } }),
    db.sellerOrder.count({ where: { status: "PENDING", order: { createdAt: { lt: dayAgo } } } }),
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
        <Stat label="Sales, last 30 days" value={formatPkr(gmv._sum.total ?? 0)} note={`${gmv._count._all} orders`} />
        <Stat label="Orders, last 24 hours" value={ordersToday} />
        <Stat
          label="Orders waiting to be confirmed"
          value={lateConfirmations}
          note="Pending for more than 24 hours"
          alert={lateConfirmations > 0}
        />
        <Stat label="Open returns" value={openReturns} alert={openReturns > 0} />
        <Stat label="Payouts ready" value={formatPkr(payoutsDue)} note={(() => {
            const n = candidates.filter((c) => c.eligibleCount).length;
            return `${n} ${n === 1 ? "seller" : "sellers"}`;
          })()} href="/admin/payouts" />
      </div>

      <section className="rounded-2xl border bg-background">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="font-semibold">Latest orders</h2>
          <span className="text-sm text-muted-foreground">Manage them in the ERP</span>
        </div>
        <ul className="divide-y">
          {recent.map((o) => (
            <li key={o.id}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <span className="font-semibold">{formatOrderNumber(o.number)}</span>
                <OrderStatusBadge status={o.status} />
                <span className="text-muted-foreground">
                  {o.shipName}, {o.shipCity} · {formatDate(o.createdAt)}
                </span>
                <span className="ml-auto font-semibold">{formatPkr(o.total)}</span>
              </div>
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
  /** Only for pages that still live on the website; orders and returns are managed in the ERP. */
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{note}</span>
        {href && <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />}
      </p>
    </>
  );
  const className = `group rounded-2xl border p-5 transition ${alert ? "border-mango bg-mango/30" : "bg-background"}`;
  return href ? (
    <Link href={href} className={`${className} hover:border-primary/40`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
