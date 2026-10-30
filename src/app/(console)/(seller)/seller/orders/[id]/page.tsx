import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AddressLines } from "@/components/account/address-card";
import { PageHeader } from "@/components/console/console-shell";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { FulfillmentPanel } from "@/components/seller/fulfillment-panel";
import { sellerEarning } from "@/lib/fulfillment";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatOrderNumber } from "@/lib/orders";
import { getSellerOrder, SELLER_ORDER_TABS } from "@/lib/seller-orders";
import { requireSeller } from "@/lib/sellers";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Order · Seller hub", robots: { index: false } };

export default function SellerOrderPage(props: PageProps<"/seller/orders/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
      <Order {...props} />
    </Suspense>
  );
}

async function Order({ params }: PageProps<"/seller/orders/[id]">) {
  const { id } = await params;
  const { seller } = await requireSeller(`/seller/orders/${id}`);
  const so = await getSellerOrder(seller.id, id);
  if (!so) notFound();

  const statusLabel = SELLER_ORDER_TABS.find((t) => t.status === so.status)?.label ?? so.status;
  const rows = [
    { label: "Items", value: formatPkr(so.subtotal) },
    { label: "Delivery fee paid by buyer", value: formatPkr(so.shippingFee) },
    { label: `Trendz commission (${seller.commissionBps / 100}%)`, value: `− ${formatPkr(so.commission)}` },
  ];

  return (
    <>
      <Breadcrumbs items={[{ label: "Orders", href: `/seller/orders?status=${so.status}` }, { label: formatOrderNumber(so.order.number) }]} />
      <div className="mt-4">
        <PageHeader
          title={formatOrderNumber(so.order.number)}
          description={`Placed ${formatDate(so.order.createdAt)} · ${PAYMENT_METHOD_LABEL[so.order.paymentMethod]} · ${statusLabel}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FulfillmentPanel sellerOrderId={so.id} status={so.status} />

          {so.trackingNumber && (
            <p className="rounded-2xl border bg-background p-5 text-sm">
              Shipped with <strong>{so.courier}</strong>, tracking <strong>{so.trackingNumber}</strong>
              {so.shippedAt && ` on ${formatDate(so.shippedAt)}`}
              {so.deliveredAt && ` · delivered ${formatDate(so.deliveredAt)}`}
            </p>
          )}

          <section className="rounded-2xl border bg-background">
            <h2 className="border-b px-5 py-3 font-semibold">Pack these items</h2>
            <ul className="divide-y">
              {so.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.productName}</p>
                    <p className="text-muted-foreground">
                      {item.variantLabel} · Qty {item.quantity}
                    </p>
                    {item.returnRequests[0] && (
                      <p className="mt-1 text-xs font-medium text-destructive">
                        Return {item.returnRequests[0].status.toLowerCase()}: {item.returnRequests[0].reason}
                      </p>
                    )}
                  </div>
                  <p className="font-semibold whitespace-nowrap">{formatPkr(item.unitPrice * item.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-3 font-semibold">Ship to</h2>
            <AddressLines
              address={{
                fullName: so.order.shipName,
                phone: so.order.shipPhone,
                line1: so.order.shipLine1,
                line2: so.order.shipLine2,
                city: so.order.shipCity,
                province: so.order.shipProvince,
                postalCode: null,
              }}
            />
            {so.order.paymentMethod === "COD" && (
              <p className="mt-3 rounded-lg bg-mango/40 px-3 py-2 text-sm">
                Courier collects <strong>{formatPkr(so.subtotal + so.shippingFee)}</strong> cash on delivery.
              </p>
            )}
          </section>
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-3 font-semibold">Your earnings</h2>
            <dl className="space-y-2 text-sm">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-bold">
                <dt>You receive</dt>
                <dd>{so.status === "CANCELLED" ? formatPkr(0) : formatPkr(sellerEarning(so))}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">Paid out weekly once the order is delivered.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
