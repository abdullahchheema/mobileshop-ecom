import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckCircle2Icon, PackageIcon, TruckIcon, XCircleIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import { getDict, langOf } from "@/i18n";
import { getErpOrder, type OrderStatus } from "@/lib/erp-orders";
import { formatPkr } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/order/[ref]">): Promise<Metadata> {
  const { ref } = await params;
  return { title: ref, robots: { index: false, follow: false } };
}

export default function OrderPage(props: PageProps<"/[lang]/order/[ref]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-secondary" />}>
        <OrderContent {...props} />
      </Suspense>
    </div>
  );
}

const REF = /^[A-Za-z0-9-]{4,40}$/;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "");

async function OrderContent({ params, searchParams }: PageProps<"/[lang]/order/[ref]">) {
  const [lang, { ref }, query] = await Promise.all([langOf(params), params, searchParams]);
  const t = getDict(lang);
  const justPlaced = query.placed === "1";

  let order: OrderStatus | null = null;
  let failed = false;
  if (REF.test(ref)) {
    try {
      order = await getErpOrder(ref);
    } catch (e) {
      console.error("[order] could not load the order from the ERP", e);
      failed = true;
    }
  }

  // Just placed: show the thank-you even if the ERP is slow to answer, because the order exists.
  if (!order && justPlaced && REF.test(ref)) {
    return <Placed t={t} lang={lang} refNo={ref} />;
  }
  if (!order) {
    return (
      <div className="rounded-2xl border p-6 text-center">
        <XCircleIcon className="mx-auto size-10 text-muted-foreground" />
        <p className="mt-3 font-semibold">{failed ? t.track.loadFailed : t.track.notFound}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/orders">{t.track.trackTitle}</Link>
        </Button>
      </div>
    );
  }

  const cancelled = order.status === "Cancelled";
  const steps = [
    { label: t.track.statuses.New, done: true },
    { label: t.track.statuses.Dispatched, done: ["Dispatched", "Delivered"].includes(order.status) },
    { label: t.track.statuses.Delivered, done: order.status === "Delivered" },
  ];

  return (
    <div className="space-y-6">
      {justPlaced && <Placed t={t} lang={lang} refNo={order.ref} compact />}
      <div className="rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t.track.refLabel}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{order.ref}</h1>
            {order.placedOn && <p className="mt-1 text-sm text-muted-foreground">{t.track.placed(date(order.placedOn))}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cancelled ? "bg-destructive/10 text-destructive" : "bg-mint text-savings"}`}>
            {t.track.statuses[order.status] ?? order.status}
          </span>
        </div>

        {!cancelled && (
          <ol className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
            {steps.map((s, i) => (
              <li key={s.label} className="space-y-1.5">
                <span className={`mx-auto flex size-9 items-center justify-center rounded-full ${s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {i === 0 ? <PackageIcon className="size-4" /> : i === 1 ? <TruckIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
                </span>
                <span className={s.done ? "font-semibold" : "text-muted-foreground"}>{s.label}</span>
              </li>
            ))}
          </ol>
        )}

        <dl className="mt-6 space-y-2 border-t pt-4 text-sm">
          <Row label={t.track.total} value={formatPkr(order.total)} />
          {order.paymentStatus && <Row label={t.track.payment} value={order.paymentStatus} />}
          {order.courier && <Row label={t.track.courier} value={order.courier} />}
          {order.tracking && <Row label={t.track.tracking} value={order.tracking} />}
          {order.dispatchedOn && <Row label={t.track.statuses.Dispatched} value={date(order.dispatchedOn)} />}
          {order.deliveredOn && <Row label={t.track.statuses.Delivered} value={date(order.deliveredOn)} />}
        </dl>
        <p className="mt-5 text-xs text-muted-foreground">{t.track.returnsNote}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Placed({ t, refNo, compact }: { t: ReturnType<typeof getDict>; lang: string; refNo: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-accent p-6 text-center">
      <CheckCircle2Icon className="mx-auto size-10 text-primary" />
      <h2 className="mt-3 text-xl font-semibold">{t.track.thanksTitle}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.track.thanksText}</p>
      <p className="mt-4 text-sm">{t.track.keepNumber}</p>
      <p className="text-2xl font-bold tracking-wide">{refNo}</p>
      {!compact && (
        <div className="mt-5 flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/">{t.track.continueShopping}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
