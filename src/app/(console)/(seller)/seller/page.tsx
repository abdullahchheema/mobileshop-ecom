import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon } from "lucide-react";
import { PageHeader } from "@/components/console/console-shell";
import { Button } from "@/components/ui/button";
import { getSellerOverview } from "@/lib/seller-orders";
import { requireSeller } from "@/lib/sellers";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Seller hub", robots: { index: false } };

export default function SellerOverviewPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const { seller } = await requireSeller("/seller");
  const stats = await getSellerOverview(seller.id);

  return (
    <>
      <PageHeader
        title={`Salaam, ${seller.shopName}`}
        description="Here's what needs your attention today."
        actions={
          <Button asChild>
            <Link href="/seller/listings/new">Add a listing</Link>
          </Button>
        }
      />

      {(stats.toConfirm > 0 || stats.toShip > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-mango bg-mango/40 p-4">
          <CircleAlertIcon className="size-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">
            {stats.toConfirm > 0 && `${stats.toConfirm} new ${stats.toConfirm === 1 ? "order" : "orders"} to confirm. `}
            {stats.toShip > 0 && `${stats.toShip} ${stats.toShip === 1 ? "order" : "orders"} to ship. `}
            Buyers expect confirmation within 1 working day.
          </p>
          <Button asChild size="sm" variant="outline" className="bg-background">
            <Link href={`/seller/orders?status=${stats.toConfirm > 0 ? "PENDING" : "CONFIRMED"}`}>Open orders</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="To confirm" value={stats.toConfirm} href="/seller/orders?status=PENDING" />
        <Stat label="To ship" value={stats.toShip} href="/seller/orders?status=CONFIRMED" />
        <Stat label="In transit" value={stats.inTransit} href="/seller/orders?status=SHIPPED" />
        <Stat
          label="Live listings"
          value={stats.liveListings}
          note={stats.soldOut > 0 ? `${stats.soldOut} sold out` : undefined}
          href="/seller/listings"
        />
        <Stat
          label="Sales this month"
          value={formatPkr(stats.monthSales)}
          note={`${stats.monthOrders} ${stats.monthOrders === 1 ? "order" : "orders"}`}
          href="/seller/orders?status=DELIVERED"
        />
        <Stat
          label="Ready for payout"
          value={formatPkr(stats.available)}
          note={stats.onHold > 0 ? `${formatPkr(stats.onHold)} in return window` : "From delivered orders"}
          href="/seller/payouts"
        />
      </div>
    </>
  );
}

function Stat({ label, value, note, href }: { label: string; value: string | number; note?: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border bg-background p-5 transition hover:border-primary/40">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{note}</span>
        <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
      </p>
    </Link>
  );
}
