import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { notFound } from "next/navigation";
import { CheckIcon, CircleCheckBigIcon, CircleXIcon } from "lucide-react";
import { AddressLines } from "@/components/account/address-card";
import { CancelOrderButton } from "@/components/account/cancel-order-button";
import { PayNowButton } from "@/components/account/pay-now-button";
import { ReturnItem } from "@/components/account/return-item";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { OrderSummaryRows } from "@/components/cart/cart-lines";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { type Lang, localizePath } from "@/i18n/config";
import { type Dict, formatDateFor, getDict, langOf, ltr, variantLabelFor } from "@/i18n";
import { SHIPMENT_STEPS } from "@/lib/order-status";
import { formatOrderNumber, getOrder, isCancellable, type OrderDetail } from "@/lib/orders";
import { canRequestReturn } from "@/lib/returns";
import { requireSession } from "@/lib/session";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/orders/[id]">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).orders.title, robots: { index: false } };
}

export default function OrderPage(props: PageProps<"/[lang]/account/orders/[id]">) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-secondary" />}>
        <Order {...props} />
      </Suspense>
    </div>
  );
}

async function Order({ params, searchParams }: PageProps<"/[lang]/account/orders/[id]">) {
  const [lang, { id }, query] = await Promise.all([langOf(params), params, searchParams]);
  const t = getDict(lang);
  const { user } = await requireSession(localizePath(`/account/orders/${id}`, lang));
  const order = await getOrder(user.id, id);
  if (!order) notFound();
  const awaitingPayment = order.paymentMethod !== "COD" && order.paymentStatus === "UNPAID" && order.status === "PENDING";

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t.account.myAccount, href: "/account" },
          { label: t.orders.orders, href: "/account/orders" },
          { label: formatOrderNumber(order.number) },
        ]}
      />

      {awaitingPayment ? (
        <AwaitingPayment t={t} lang={lang} orderId={order.id} total={order.total} dueAt={order.paymentDueAt} notice={query.payment} />
      ) : (
        query.payment === "cancelled" &&
        order.status === "CANCELLED" && (
          <p className="rounded-2xl bg-secondary p-4 text-sm">{t.orders.expired}</p>
        )
      )}

      {query.placed === "1" && order.status !== "CANCELLED" && !awaitingPayment && (
        <div className="flex gap-4 rounded-3xl bg-mint p-6">
          <CircleCheckBigIcon className="size-8 shrink-0 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.orders.thanks}</h1>
            <p className="mt-1 text-foreground/75">
              {t.orders.thanksText(ltr(order.shipPhone))}
              {order.paymentMethod === "COD" ? t.orders.keepCash(formatPkr(order.total)) : t.orders.paymentReceived(formatPkr(order.total))}
            </p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">{formatOrderNumber(order.number)}</h2>
            <OrderStatusBadge status={order.status} t={t} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.orders.placedOn(formatDateFor(order.createdAt, lang))}</p>
        </div>
        {isCancellable(order) && <CancelOrderButton orderId={order.id} />}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {order.sellerOrders.map((shipment, i) => (
            <Shipment key={shipment.id} t={t} shipment={shipment} index={i} count={order.sellerOrders.length} />
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border p-5">
            <h3 className="mb-3 font-semibold">{t.orders.deliveryAddress}</h3>
            <AddressLines
              address={{
                fullName: order.shipName,
                phone: order.shipPhone,
                line1: order.shipLine1,
                line2: order.shipLine2,
                city: order.shipCity,
                province: order.shipProvince,
                postalCode: null,
              }}
              t={t}
            />
          </section>
          <section className="rounded-2xl border p-5">
            <h3 className="mb-3 font-semibold">{t.orders.paymentTitle}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {t.orders.methods[order.paymentMethod] ?? order.paymentMethod} ·{" "}
              {order.paymentStatus === "PAID"
                ? t.orders.paid
                : order.paymentStatus === "REFUNDED"
                  ? t.orders.refunded
                  : t.orders.notPaid}
            </p>
            <OrderSummaryRows t={t} subtotal={order.subtotal} shipping={order.shippingFee} total={order.total} />
          </section>
          <p className="text-sm text-muted-foreground">
            {t.orders.help}{" "}
            <Link href="/help" className="font-medium text-primary hover:underline">
              {t.orders.contact}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}

function Shipment({
  t,
  shipment,
  index,
  count,
}: {
  t: Dict;
  shipment: OrderDetail["sellerOrders"][number];
  index: number;
  count: number;
}) {
  const cancelled = shipment.status === "CANCELLED" || shipment.status === "RETURNED";
  const reached = SHIPMENT_STEPS.findIndex((s) => s.status === shipment.status);

  return (
    <section className="rounded-2xl border">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-secondary/50 px-5 py-3 text-sm">
        <p className="font-semibold">{t.cart.shipment(index + 1, count, shipment.seller.shopName, shipment.seller.city)}</p>
        {shipment.trackingNumber && (
          <p className="text-muted-foreground">{t.orders.tracking(shipment.courier ?? "", shipment.trackingNumber)}</p>
        )}
      </header>

      <div className="px-5 py-4">
        {cancelled ? (
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <CircleXIcon className="size-4" /> {t.orders.status[shipment.status]}
          </p>
        ) : (
          <ol className="grid grid-cols-4 gap-2" aria-label={t.orders.progress}>
            {SHIPMENT_STEPS.map((step, i) => {
              const done = i <= reached;
              return (
                <li key={step.status} className="flex flex-col items-center gap-2 text-center">
                  <div className="flex w-full items-center">
                    <span className={cn("h-0.5 flex-1", i === 0 ? "invisible" : done ? "bg-primary" : "bg-border")} />
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                        done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                      )}
                    >
                      {done && <CheckIcon className="size-4" strokeWidth={3} />}
                    </span>
                    <span
                      className={cn("h-0.5 flex-1", i === SHIPMENT_STEPS.length - 1 ? "invisible" : i < reached ? "bg-primary" : "bg-border")}
                    />
                  </div>
                  <span className={cn("text-xs", done ? "font-semibold" : "text-muted-foreground")}>{t.orders.steps[step.status] ?? step.label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <ul className="divide-y border-t">
        {shipment.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
            <div>
              <Link
                href={`/p/${item.offer.variant.product.slug}`}
                className="font-semibold hover:text-primary hover:underline"
              >
                {item.productName}
              </Link>
              <p className="text-muted-foreground">
                {variantLabelFor(t, item.variantLabel)} · {t.common.qty(item.quantity)}
              </p>
              <ReturnItem
                orderItemId={item.id}
                latest={item.returnRequests[0] ?? null}
                canReturn={
                  shipment.status === "DELIVERED" &&
                  canRequestReturn(shipment.deliveredAt, new Date()) &&
                  !item.returnRequests.some((r) => r.status !== "REJECTED")
                }
              />
            </div>
            <p className="shrink-0 font-semibold whitespace-nowrap">{formatPkr(item.unitPrice * item.quantity)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AwaitingPayment({
  t,
  lang,
  orderId,
  total,
  dueAt,
  notice,
}: {
  t: Dict;
  lang: Lang;
  orderId: string;
  total: number;
  dueAt: Date | null;
  notice?: string | string[];
}) {
  const message = typeof notice === "string" ? t.orders.notices[notice] : undefined;
  const time = dueAt
    ? new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", { timeStyle: "short", timeZone: "Asia/Karachi" }).format(dueAt)
    : null;
  return (
    <div className="space-y-3 rounded-3xl border-2 border-mango bg-mango/30 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t.orders.completePayment}</h1>
      {message && <p className="font-medium">{message}</p>}
      <p className="text-foreground/75">{t.orders.reserved(time)}</p>
      <PayNowButton orderId={orderId} label={t.orders.payNow(formatPkr(total))} />
    </div>
  );
}
