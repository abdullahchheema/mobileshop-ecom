import "server-only";
import type { OrderStatus, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const ADMIN_ORDER_TABS: { status: OrderStatus | "ALL"; label: string }[] = [
  { status: "ALL", label: "All" },
  { status: "PENDING", label: "Placed" },
  { status: "CONFIRMED", label: "Confirmed" },
  { status: "PARTIALLY_SHIPPED", label: "Partly shipped" },
  { status: "SHIPPED", label: "Shipped" },
  { status: "DELIVERED", label: "Delivered" },
  { status: "CANCELLED", label: "Cancelled" },
  { status: "RETURNED", label: "Returned" },
];

/** Search by order number (TZ-000123 or 123), buyer name or phone. */
function searchWhere(q: string): Prisma.OrderWhereInput {
  const number = /^(tz-?)?0*(\d+)$/i.exec(q.trim())?.[2];
  // Phones are stored as +92…; drop a leading 0, 92 or 0092 so "0321…" matches.
  const phoneDigits = q.replace(/\D/g, "").replace(/^(0092|92|0)/, "");
  return {
    OR: [
      ...(number ? [{ number: Number(number) }] : []),
      { shipName: { contains: q, mode: "insensitive" } },
      ...(phoneDigits.length >= 3 ? [{ shipPhone: { contains: phoneDigits.slice(-10) } }] : []),
    ],
  };
}

export async function listAdminOrders(opts: { status: OrderStatus | "ALL"; q?: string; page: number; sellerId?: string }) {
  const pageSize = 30;
  const where: Prisma.OrderWhereInput = {
    ...(opts.sellerId && { sellerOrders: { some: { sellerId: opts.sellerId } } }),
    ...(opts.status !== "ALL" && { status: opts.status }),
    ...(opts.q && searchWhere(opts.q)),
  };
  const [total, orders] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        createdAt: true,
        shipName: true,
        shipCity: true,
        _count: { select: { sellerOrders: true } },
      },
    }),
  ]);
  return { orders, total, pageCount: Math.ceil(total / pageSize) };
}

export function getAdminOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phoneNumber: true } },
      payments: true,
      sellerOrders: {
        orderBy: { id: "asc" },
        include: {
          seller: { select: { shopName: true, city: true, phone: true } },
          items: { include: { returnRequests: { orderBy: { createdAt: "desc" }, select: { status: true } } } },
        },
      },
    },
  });
}
