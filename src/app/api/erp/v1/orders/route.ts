import { ADMIN_ORDER_TABS, listAdminOrders } from "@/lib/admin-orders";
import { requireCrmSource } from "@/lib/crm-sync";

/** The shop's online orders for the ERP's E-commerce screen. `?status=PENDING|CONFIRMED|…|ALL&q=&page=`. */
export async function GET(request: Request) {
  const source = await requireCrmSource(request);
  if (source instanceof Response) return source;

  const url = new URL(request.url);
  const wanted = url.searchParams.get("status") ?? "ALL";
  const status = ADMIN_ORDER_TABS.find((t) => t.status === wanted)?.status ?? "ALL";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const { orders, total, pageCount } = await listAdminOrders({
    status,
    q: url.searchParams.get("q")?.trim() || undefined,
    page,
    sellerId: source.sellerId,
  });
  return Response.json({ orders, total, pageCount, page, statuses: ADMIN_ORDER_TABS });
}
