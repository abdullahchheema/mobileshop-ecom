import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { setCommissionAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { SellerStatusActions } from "@/components/console/seller-status-actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order-status";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Sellers · Admin", robots: { index: false } };

const TABS = [
  { status: "PENDING", label: "Awaiting review" },
  { status: "APPROVED", label: "Approved" },
  { status: "SUSPENDED", label: "Suspended" },
  { status: "REJECTED", label: "Rejected" },
] as const;

export default function AdminSellersPage(props: PageProps<"/admin/sellers">) {
  return (
    <>
      <PageHeader title="Sellers" description="Review applications and manage who can sell on Trendz." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-background" />}>
        <Sellers {...props} />
      </Suspense>
    </>
  );
}

async function Sellers({ searchParams }: PageProps<"/admin/sellers">) {
  await requireAdmin("/admin/sellers");
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? "PENDING";

  const [counts, sellers] = await Promise.all([
    db.seller.groupBy({ by: ["status"], _count: { _all: true } }),
    db.seller.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { offers: { where: { status: "ACTIVE", stock: { gt: 0 } } } } },
      },
    }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-4">
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-background p-1 scrollbar-none" aria-label="Seller status">
        {TABS.map((t) => (
          <Link
            key={t.status}
            href={`/admin/sellers?status=${t.status}`}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap",
              t.status === status ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {t.label} <span className="ml-1 text-xs">({countOf(t.status)})</span>
          </Link>
        ))}
      </nav>

      {sellers.length === 0 ? (
        <p className="rounded-2xl bg-background p-10 text-center text-muted-foreground">No sellers here.</p>
      ) : (
        <ul className="space-y-3">
          {sellers.map((s) => (
            <li key={s.id} className="rounded-2xl border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold">{s.shopName}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.city} · applied {formatDate(s.createdAt)}
                    {s.status === "APPROVED" && ` · ${s._count.offers} live listings`}
                  </p>
                </div>
                <SellerStatusActions sellerId={s.id} status={s.status} shopName={s.shopName} />
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail term="Owner" detail={`${s.user.name} · ${s.user.email}`} />
                <Detail term="Phone" detail={s.phone} />
                <Detail term="CNIC" detail={s.cnic} />
                <Detail term="NTN" detail={s.ntn ?? "—"} />
                <Detail term="Bank" detail={[s.bankName, s.accountTitle].filter(Boolean).join(" · ") || "—"} />
                <Detail term="IBAN" detail={s.iban ?? "—"} />
                <div className="min-w-0">
                  <dt className="text-xs text-muted-foreground">Commission (new orders)</dt>
                  <dd>
                    <ActionForm action={setCommissionAction} className="flex items-center gap-1">
                      <input type="hidden" name="sellerId" value={s.id} />
                      <input
                        name="percent"
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        defaultValue={s.commissionBps / 100}
                        aria-label="Commission percent"
                        className="h-8 w-16 rounded-lg border border-input px-2 text-sm"
                      />
                      <span className="text-sm">%</span>
                      <Button type="submit" variant="ghost" size="xs">
                        Save
                      </Button>
                    </ActionForm>
                  </dd>
                </div>
              </dl>
              {s.description && <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Detail({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{term}</dt>
      <dd className="truncate font-medium">{detail}</dd>
    </div>
  );
}
