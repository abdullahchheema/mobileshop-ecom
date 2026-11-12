import { getAdminOrder } from "@/lib/admin-orders";
import { requireCrmSource } from "@/lib/crm-sync";
import { notFound } from "@/lib/erp-api";
import { allowedActions, COURIERS } from "@/lib/fulfillment";
import { isCancellable } from "@/lib/orders";

/** One order with the shop's shipments, the next steps allowed on each, and its payments. */
export async function GET(request: Request, { params }: RouteContext<"/api/erp/v1/orders/[id]">) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const { id } = await params;
  const order = await getAdminOrder(id);
  const shipments = order?.sellerOrders.filter((so) => so.sellerId === source.sellerId) ?? [];
  if (!order || shipments.length === 0) return notFound("That order");

  return Response.json({
    couriers: COURIERS,
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      cancellable: isCancellable(order),
      buyer: { name: order.user.name, email: order.user.email, phone: order.user.phoneNumber },
      shipTo: {
        name: order.shipName,
        phone: order.shipPhone,
        line1: order.shipLine1,
        line2: order.shipLine2,
        city: order.shipCity,
        province: order.shipProvince,
      },
      // Gateway payloads (`raw`) stay on the website.
      payments: order.payments.map((p) => ({ id: p.id, provider: p.provider, status: p.status, amount: p.amount, refundedAmount: p.refundedAmount })),
      shipments: shipments.map((so) => ({
        id: so.id,
        status: so.status,
        allowedActions: allowedActions(so.status),
        subtotal: so.subtotal,
        shippingFee: so.shippingFee,
        courier: so.courier,
        trackingNumber: so.trackingNumber,
        shippedAt: so.shippedAt,
        deliveredAt: so.deliveredAt,
        items: so.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          returnStatus: item.returnRequests[0]?.status ?? null,
        })),
      })),
    },
  });
}
