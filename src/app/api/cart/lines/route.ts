import { z } from "zod";
import { getVariantsByKey } from "@/lib/catalog";
import { buildCartView, MAX_LINES } from "@/lib/cart";
import { apiError } from "@/lib/http";

const body = z.object({
  items: z.array(z.object({ key: z.string().min(1).max(200), qty: z.number().int().min(1).max(99) })).max(MAX_LINES),
});

/** Prices a cart from the ERP's current data. The browser sends only variant keys and quantities. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID", "Invalid cart.");
  const current = await getVariantsByKey(parsed.data.items.map((i) => i.key));
  return Response.json({ cart: buildCartView(parsed.data.items, current) });
}
