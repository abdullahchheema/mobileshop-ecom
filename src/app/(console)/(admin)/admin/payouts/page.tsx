import type { Metadata } from "next";
import { Suspense } from "react";
import { createPayoutAction, markPayoutPaidAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/order-status";
import { getPayoutCandidates, listPayouts } from "@/lib/payouts";
import { RETURN_WINDOW_DAYS } from "@/lib/returns";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Payouts · Admin", robots: { index: false } };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function PayoutsPage() {
  return (
    <>
      <PageHeader
        title="Payouts"
        description={`Sellers are paid for delivered orders once the ${RETURN_WINDOW_DAYS}-day return window has closed and no return is open. Create a payout, send the bank transfer, then mark it paid.`}
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Payouts />
      </Suspense>
    </>
  );
}

async function Payouts() {
  await requireAdmin("/admin/payouts");
  const [candidates, pending, paid] = await Promise.all([getPayoutCandidates(), listPayouts("PENDING"), listPayouts("PAID")]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-semibold">1. Ready to pay</h2>
        {candidates.length === 0 ? (
          <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">No seller has delivered, unpaid orders.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
            {candidates.map((c) => (
              <li key={c.seller.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 text-sm">
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{c.seller.shopName}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.seller.bankName ?? "No bank"} · {c.seller.iban ?? "No IBAN"}
                  </p>
                </div>
                <div>
                  <p className="font-bold">{formatPkr(c.eligibleAmount)}</p>
                  <p className="text-xs text-muted-foreground">{plural(c.eligibleCount, "order")} ready</p>
                </div>
                <div className="text-muted-foreground">
                  <p>{formatPkr(c.heldAmount)}</p>
                  <p className="text-xs">{c.heldCount} on hold</p>
                </div>
                <ActionForm action={createPayoutAction}>
                  <input type="hidden" name="sellerId" value={c.seller.id} />
                  <Button type="submit" size="sm" disabled={c.eligibleCount === 0 || !c.seller.iban}>
                    Create payout
                  </Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">2. Send the transfer, then mark as paid</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">No payouts waiting for a transfer.</p>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <li key={p.id} className="rounded-2xl border bg-background p-5">
                <div className="flex flex-wrap items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{p.seller.shopName}</p>
                    <p className="text-muted-foreground">
                      Transfer to {p.seller.accountTitle} · {p.seller.bankName}
                    </p>
                    <p className="font-mono">{p.seller.iban}</p>
                    <p className="text-xs text-muted-foreground">
                      {plural(p._count.sellerOrders, "order")} delivered {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                    </p>
                  </div>
                  <p className="text-2xl font-semibold">{formatPkr(p.amount)}</p>
                </div>
                <ActionForm action={markPayoutPaidAction} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="payoutId" value={p.id} />
                  <input
                    name="reference"
                    required
                    placeholder="Bank transfer reference"
                    className="h-9 w-64 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                  <Button type="submit" size="sm">
                    Mark as paid
                  </Button>
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Paid</h2>
        {paid.length === 0 ? (
          <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">No payouts yet.</p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-2xl border bg-background text-sm">
            {paid.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
                <span className="font-medium">{p.seller.shopName}</span>
                <span className="text-muted-foreground">
                  {p.paidAt && formatDate(p.paidAt)} · ref {p.reference}
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
