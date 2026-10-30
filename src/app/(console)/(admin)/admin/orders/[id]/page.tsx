import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AddressLines } from "@/components/account/address-card";
import { OrderStatusBadge } from "@/components/account/order-status-badge";
import { AdminCancelOrder } from "@/components/admin/admin-cancel-order";
import { OrderSummaryRows } from "@/components/cart/cart-lines";
import { PageHeader } from "@/components/console/console-shell";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { requireAdmin } from "@/lib/admin";
import { getAdminOrder } from "@/lib/admin-orders";
import { formatDate, PAYMENT_METHOD_LABEL } from "@/lib/order-status";
import { formatOrderNumber, isCancellable } from "@/lib/orders";
import { formatPkr } from "@/lib/site";

export const metadata: Metadata = { title: "Order · Admin", robots: { index: false } };

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
      <Order {...props} />
    </Suspense>
  );
}

async function Order({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  await requireAdmin(`/admin/orders/${id}`);
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Orders", href: "/admin/orders" }, { label: formatOrderNumber(order.number) }]} />
      <PageHeader
        title={formatOrderNumber(order.number)}
        description={`Placed ${formatDate(order.createdAt)} by ${order.user.name} (${order.user.phoneNumber ?? order.user.email})`}
        actions={
          <div className="flex items-center gap-3">
            <OrderStatusBadge status={order.status} />
            {isCancellable(order) && <AdminCancelOrder orderId={order.id} />}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {order.sellerOrders.map((so) => (
            <section key={so.id} className="rounded-2xl border bg-background">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm">
                <p className="font-semibold">
                  {so.seller.shopName}, {so.seller.city} <span className="font-normal text-muted-foreground">· {so.seller.phone}</span>
                </p>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">{so.status}</span>
              </header>
              <ul className="divide-y">
                {so.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4 px-5 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{item.productName}</p>
                      <p className="text-muted-foreground">
                        {item.variantLabel} · Qty {item.quantity}
                        {item.returnRequests[0] && ` · Return ${item.returnRequests[0].status.toLowerCase()}`}
                      </p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">{formatPkr(item.unitPrice * item.quantity)}</p>
                  </li>
                ))}
              </ul>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-t px-5 py-3 text-xs text-muted-foreground sm:grid-cols-4">
                <div>Items {formatPkr(so.subtotal)}</div>
                <div>Delivery {formatPkr(so.shippingFee)}</div>
                <div>Commission {formatPkr(so.commission)}</div>
                <div>{so.trackingNumber ? `${so.courier} ${so.trackingNumber}` : "Not shipped"}</div>
              </dl>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-3 font-semibold">Ship to</h2>
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
            />
          </section>
          <section className="rounded-2xl border bg-background p-5">
            <h2 className="mb-1 font-semibold">Payment</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {PAYMENT_METHOD_LABEL[order.paymentMethod]} · {order.paymentStatus.toLowerCase()}
            </p>
            <OrderSummaryRows subtotal={order.subtotal} shipping={order.shippingFee} total={order.total} />
          </section>
        </aside>
      </div>
    </div>
  );
}
