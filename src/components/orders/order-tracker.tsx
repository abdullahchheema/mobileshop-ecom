"use client";

import { useEffect, useState } from "react";
import { CheckCircle2Icon, PackageIcon, TruckIcon, XCircleIcon } from "lucide-react";
import { Field } from "@/components/form/field";
import { useI18n } from "@/components/i18n/lang-provider";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import { recentOrders } from "@/lib/cart-store";
import type { OrderStatus } from "@/lib/erp-orders";
import { formatPkr } from "@/lib/site";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "");

type State = { kind: "idle" } | { kind: "loading" } | { kind: "found"; order: OrderStatus } | { kind: "error"; message: string };

/** Shows an order after checking the order number against the phone it was placed with (done on the server). */
export function OrderTracker({ refNo, justPlaced }: { refNo: string; justPlaced: boolean }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: "loading" });

  async function load(phone: string) {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: refNo, phone }) });
      const body = await response.json().catch(() => null);
      if (response.ok) setState({ kind: "found", order: body.order });
      else setState({ kind: "error", message: String(body?.error?.message ?? t.track.loadFailed) });
    } catch {
      setState({ kind: "error", message: t.track.loadFailed });
    }
  }

  // An order placed on this device remembers its phone number here, so its owner does not retype it.
  useEffect(() => {
    const own = recentOrders().find((o) => o.ref.toUpperCase() === refNo.toUpperCase());
    // Deferred a tick: the phone is read from the browser, so this is a subscription to external state.
    const timer = setTimeout(() => (own?.phone ? void load(own.phone) : setState({ kind: "idle" })), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refNo]);

  if (state.kind === "loading") return <div className="h-64 animate-pulse rounded-2xl bg-secondary" />;
  if (state.kind === "found") return <OrderDetails order={state.order} justPlaced={justPlaced} />;

  return (
    <div className="space-y-4">
      {justPlaced && <Placed refNo={refNo} />}
      <form
        className="space-y-4 rounded-2xl border p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void load(String(new FormData(e.currentTarget).get("phone") ?? ""));
        }}
      >
        <div>
          <p className="text-sm text-muted-foreground">{t.track.refLabel}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{refNo}</h1>
        </div>
        <p className="text-sm">{t.track.phoneNeeded}</p>
        <Field label={t.track.phoneLabel} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" required />
        {state.kind === "error" && (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <XCircleIcon className="size-4" /> {state.message}
          </p>
        )}
        <Button type="submit">{t.track.trackButton}</Button>
      </form>
    </div>
  );
}

function OrderDetails({ order, justPlaced }: { order: OrderStatus; justPlaced: boolean }) {
  const { t } = useI18n();
  const main = order.orderStatus ?? order.status;
  const cancelled = order.status === "Cancelled";
  const confirmed = main !== "Unconfirmed" && main !== "New";
  const steps = [
    { label: t.track.statuses.New, done: true },
    { label: t.track.statuses.Confirmed, done: confirmed },
    { label: t.track.statuses.Dispatched, done: ["Dispatched", "Delivered", "Returned"].includes(order.status) },
    { label: t.track.statuses.Delivered, done: order.status === "Delivered" },
  ];
  return (
    <div className="space-y-6">
      {justPlaced && <Placed refNo={order.ref} compact />}
      <div className="rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t.track.refLabel}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{order.ref}</h1>
            {order.placedOn && <p className="mt-1 text-sm text-muted-foreground">{t.track.placed(date(order.placedOn))}</p>}
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${cancelled ? "bg-destructive/10 text-destructive" : "bg-mint text-savings"}`}>
            {t.track.statuses[main] ?? main}
          </span>
          {order.stage && order.stage !== order.status && <p className="w-full text-sm text-muted-foreground">{order.stage}</p>}
        </div>

        {!cancelled && (
          <ol className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
            {steps.map((s, i) => (
              <li key={s.label} className="space-y-1.5">
                <span className={`mx-auto flex size-9 items-center justify-center rounded-full ${s.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {i === 0 ? <PackageIcon className="size-4" /> : i === 1 ? <CheckCircle2Icon className="size-4" /> : i === 2 ? <TruckIcon className="size-4" /> : <CheckCircle2Icon className="size-4" />}
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

function Placed({ refNo, compact }: { refNo: string; compact?: boolean }) {
  const { t } = useI18n();
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
