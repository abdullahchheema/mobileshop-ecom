import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/console/console-shell";
import { formatDate } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { getSellerEarnings } from "@/lib/payouts";
import { RETURN_WINDOW_DAYS, returnDeadline } from "@/lib/returns";
import { requireSeller } from "@/lib/sellers";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings & payouts · Seller hub", robots: { index: false } };

export default function PayoutsPage() {
  return (
    <>
      <PageHeader
        title="Earnings & payouts"
        description={`Earnings become payable ${RETURN_WINDOW_DAYS} days after delivery, once the buyer's return window has closed. We pay every Monday.`}
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Earnings />
      </Suspense>
    </>
  );
}

const maskIban = (iban: string | null) => (iban ? `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}` : "Not set");

async function Earnings() {
  const { seller } = await requireSeller("/seller/payouts");
  const earnings = await getSellerEarnings(seller.id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card dark label="Ready for next payout" value={formatPkr(earnings.available)} note="Return window closed" />
        <Card label="In return window" value={formatPkr(earnings.onHold)} note={`Payable ${RETURN_WINDOW_DAYS} days after delivery`} />
        <Card
          label="On the way"
          value={formatPkr(earnings.upcoming)}
          note={`${earnings.upcomingCount} open ${earnings.upcomingCount === 1 ? "order" : "orders"}`}
        />
        <div className="rounded-2xl border bg-background p-5">
          <p className="text-sm text-muted-foreground">Paid to</p>
          <p className="mt-2 font-semibold">{seller.bankName ?? "No bank account"}</p>
          <p className="text-sm text-muted-foreground">{seller.accountTitle}</p>
          <p className="font-mono text-sm">{maskIban(seller.iban)}</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-background">
        <h2 className="border-b px-5 py-3 font-semibold">Delivered, not yet paid</h2>
        {earnings.shipments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nothing waiting to be paid. New earnings appear here once an order is delivered.
          </p>
        ) : (
          <ul className="divide-y">
            {earnings.shipments.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm">
                <Link href={`/seller/orders/${s.id}`} className="font-medium hover:text-primary hover:underline">
                  {formatOrderNumber(s.number)}
                </Link>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    s.state === "eligible" ? "bg-mint text-savings" : "bg-mango/50",
                  )}
                >
                  {s.state === "eligible"
                    ? "Ready"
                    : s.deliveredAt && returnDeadline(s.deliveredAt) > new Date()
                      ? `Payable after ${formatDate(returnDeadline(s.deliveredAt))}`
                      : "Return in progress"}
                </span>
                <span className="ml-auto font-semibold">
                  {formatPkr(s.earning)}
                  {s.refunded > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">(after refund)</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-background">
        <h2 className="border-b px-5 py-3 font-semibold">Payout history</h2>
        {earnings.payouts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <ul className="divide-y">
            {earnings.payouts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 text-sm">
                <span>
                  Deliveries {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                </span>
                <span className="text-muted-foreground">
                  {p.status === "PAID" ? `Paid ${p.paidAt ? formatDate(p.paidAt) : ""} · ref ${p.reference ?? "—"}` : "Processing"}
                </span>
                <span className="font-semibold">{formatPkr(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ label, value, note, dark }: { label: string; value: string; note: string; dark?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-5", dark ? "bg-ink text-white" : "border bg-background")}>
      <p className={cn("text-sm", dark ? "text-white/70" : "text-muted-foreground")}>{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className={cn("mt-1 text-xs", dark ? "text-white/70" : "text-muted-foreground")}>{note}</p>
    </div>
  );
}
