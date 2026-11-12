import { z } from "zod";
import { getVariantsByKey } from "@/lib/catalog";
import { buildCartView, clampQuantity, MAX_LINES } from "@/lib/cart";
import { ErpOrderConfigError, placeErpOrder } from "@/lib/erp-orders";
import { apiError } from "@/lib/http";
import { normalizePkMobile } from "@/lib/phone";
import { PAYMENT_METHODS } from "@/lib/payment";
import { PROVINCES } from "@/lib/pakistan";
import { clientIp, tooMany } from "@/lib/rate-limit";

const provinces = PROVINCES.map((p) => p.value) as [string, ...string[]];

const body = z.object({
  /** Generated once per checkout in the browser; the ERP treats a repeat of the same ref as the same order. */
  orderId: z.string().regex(/^[A-Za-z0-9]{8,24}$/, "Invalid order id"),
  items: z.array(z.object({ key: z.string().min(1).max(200), qty: z.number().int().min(1).max(99) })).min(1, "Your cart is empty.").max(MAX_LINES),
  expectedTotal: z.number().nonnegative(),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: "Choose a payment method" }).default("Cash on Delivery"),
  paymentReference: z.string().trim().max(80).optional().transform((v) => v || undefined),
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizePkMobile(v);
    if (!phone) ctx.addIssue({ code: "custom", message: "Enter a valid Pakistani mobile number" });
    return phone ?? "";
  }),
  email: z.string().trim().email("Enter a valid email").max(120).optional().or(z.literal("").transform(() => undefined)),
  line1: z.string().trim().min(5, "Enter house number, street and area").max(200),
  line2: z.string().trim().max(200).optional().transform((v) => v || undefined),
  city: z.string().trim().min(2, "Enter a city").max(60),
  province: z.enum(provinces, { message: "Choose a province" }),
  notes: z.string().trim().max(300).optional().transform((v) => v || undefined),
  /** Honeypot: real people never fill this in. */
  website: z.string().max(0, "Please check your details and try again.").optional(),
});

/**
 * Places an order (cash on delivery or a prepaid method the shop confirms). The browser's cart only names variants and quantities: prices and totals are
 * rebuilt here from the ERP's data, compared with what the customer saw, and sent to the ERP, which re-checks everything.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  // A loose cap on any request (typos are fine); a strict one below, only on requests that would reach the ERP.
  if (tooMany(`checkout-any:${ip}`, 60, 10 * 60_000)) return apiError(429, "RATE_LIMITED", "Too many attempts from this connection. Please wait a few minutes.");
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID", parsed.error.issues[0]?.message ?? "Please check your details.");
  const input = parsed.data;

  const items = input.items.map((i) => ({ key: i.key, qty: clampQuantity(i.qty) }));
  const current = await getVariantsByKey(items.map((i) => i.key));
  const cart = buildCartView(items, current);
  if (cart.hasUnavailable) return apiError(409, "OUT_OF_STOCK", "Some items are no longer available. Please review your cart.");
  if (Math.abs(cart.totals.total - input.expectedTotal) > 0.01) return apiError(409, "PRICE_CHANGED", "The price changed. Please review your cart and confirm again.");

  if (tooMany(`checkout-order:${ip}`, 8, 10 * 60_000)) return apiError(429, "RATE_LIMITED", "Too many orders from this connection. Please wait a few minutes.");

  try {
    const result = await placeErpOrder({
      ref: `TM-${input.orderId.toUpperCase()}`,
      customer: { name: input.name, phone: input.phone, email: input.email, line1: input.line1, line2: input.line2, city: input.city, province: input.province },
      notes: input.notes,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentMethod === "Cash on Delivery" ? undefined : input.paymentReference,
      lines: items.map((i) => ({ variant: current.get(i.key)!, quantity: i.qty })),
      deliveryFee: cart.totals.shipping,
      expectedTotal: cart.totals.total,
    });
    if (!result.ok) return apiError(result.code === "UNAVAILABLE" ? 503 : result.status || 409, result.code, result.message);
    return Response.json({ order: { ref: result.ref, total: result.total || cart.totals.total, status: result.status } }, { status: 201 });
  } catch (e) {
    if (e instanceof ErpOrderConfigError) {
      console.error("[checkout]", e.message);
      return apiError(503, "UNAVAILABLE", "Orders are temporarily unavailable. Please try again later.");
    }
    throw e;
  }
}
