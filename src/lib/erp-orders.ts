import type { CurrentVariant } from "@/lib/cart";
import { provinceLabel } from "@/lib/pakistan";

// Orders go to the ERP's order API (POST /api/online/orders/, header X-API-Key). Prices and totals are recomputed by
// the ERP from its own data; what we send is only compared against them. The ERP's response decides everything.

export type Customer = { name: string; phone: string; email?: string; line1: string; line2?: string; city: string; province: string };

export type OrderInput = {
  /** Our order number: stable across retries, so a double click or a retry never creates a second order. */
  ref: string;
  customer: Customer;
  notes?: string;
  lines: { variant: CurrentVariant; quantity: number }[];
  deliveryFee: number;
  expectedTotal: number;
};

/** The body for POST /api/online/orders/. Pure, so it is easy to test. */
export function buildOrderPayload(o: OrderInput) {
  const address = [o.customer.line1, o.customer.line2, provinceLabel(o.customer.province)].filter(Boolean).join(", ");
  return {
    external_ref: o.ref,
    customer: {
      name: o.customer.name,
      phone: o.customer.phone,
      ...(o.customer.email && { email: o.customer.email }),
      address,
      city: o.customer.city,
    },
    payment_method: "Cash on Delivery",
    delivery_fee: o.deliveryFee,
    expected_total: o.expectedTotal,
    ...(o.notes && { notes: o.notes }),
    items: o.lines.map(({ variant: v, quantity }) => ({
      product_id: v.productId,
      // Phones: condition, pta_status and device_type exactly as in the web_variants row.
      ...(v.condition !== null && { condition: v.condition }),
      ...(v.pta !== null && { pta_status: v.pta }),
      ...(v.type !== null && { device_type: v.type }),
      price: String(v.price),
      quantity,
    })),
  };
}

export type PlaceResult =
  | { ok: true; ref: string; total: number; status: string; created: boolean }
  | { ok: false; code: "PRICE_CHANGED" | "OUT_OF_STOCK" | "CONFLICT" | "INVALID" | "UNAVAILABLE"; message: string; status: number };

type ErpBody = { error?: string; message?: string; external_ref?: string; total?: number | string; status?: string; created?: boolean };

/** Maps the ERP's answer to what the checkout needs (see section 3 of the integration guide). */
export function classifyPlaceResponse(status: number, body: ErpBody | null, fallbackRef: string): PlaceResult {
  const message = String(body?.error ?? body?.message ?? "").trim();
  if (status === 201 || status === 200) {
    return { ok: true, ref: body?.external_ref ?? fallbackRef, total: Number(body?.total ?? 0), status: body?.status ?? "New", created: status === 201 || body?.created !== false };
  }
  if (status === 409) {
    const code = /price/i.test(message) ? "PRICE_CHANGED" : /stock|sold|available|quantity/i.test(message) ? "OUT_OF_STOCK" : "CONFLICT";
    return { ok: false, code, message: message || "Some items changed. Please review your cart.", status };
  }
  if (status === 400) return { ok: false, code: "INVALID", message: message || "Please check your details and try again.", status };
  // 401 (wrong key / API off), 5xx, anything else: the customer can only try again later.
  return { ok: false, code: "UNAVAILABLE", message: "We couldn't place your order right now. Please try again in a few minutes.", status };
}

export class ErpOrderConfigError extends Error {}

function config() {
  const url = process.env.ERP_API_URL?.replace(/\/+$/, "");
  const key = process.env.ERP_API_KEY;
  if (!url || !key) throw new ErpOrderConfigError("Set ERP_API_URL and ERP_API_KEY (server-side only).");
  return { url, key };
}

export async function placeErpOrder(order: OrderInput): Promise<PlaceResult> {
  const { url, key } = config();
  let response: Response;
  try {
    response = await fetch(`${url}/api/online/orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": key },
      body: JSON.stringify(buildOrderPayload(order)),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (e) {
    console.error("[erp-orders] could not reach the ERP", e);
    return { ok: false, code: "UNAVAILABLE", message: "We couldn't place your order right now. Please try again in a few minutes.", status: 0 };
  }
  const body = (await response.json().catch(() => null)) as ErpBody | null;
  if (response.status === 401) console.error("[erp-orders] the ERP rejected ERP_API_KEY (401): check the key or that the API is switched on");
  return classifyPlaceResponse(response.status, body, order.ref);
}

export type OrderStatus = {
  ref: string;
  status: string; // New | Dispatched | Delivered | Cancelled
  paymentStatus: string | null;
  courier: string | null;
  tracking: string | null;
  total: number;
  placedOn: string | null;
  dispatchedOn: string | null;
  deliveredOn: string | null;
};

/** Tracking: GET /api/online/orders/{ref}/. Returns null when the ERP does not know the reference. */
export async function getErpOrder(ref: string): Promise<OrderStatus | null> {
  const { url, key } = config();
  const response = await fetch(`${url}/api/online/orders/${encodeURIComponent(ref)}/`, {
    headers: { "X-API-Key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`The ERP answered ${response.status}`);
  const b = (await response.json()) as Record<string, string | number | null>;
  return {
    ref: String(b.external_ref ?? ref),
    status: String(b.status ?? "New"),
    paymentStatus: b.payment_status ? String(b.payment_status) : null,
    courier: b.courier ? String(b.courier) : null,
    tracking: b.tracking ? String(b.tracking) : null,
    total: Number(b.total ?? 0),
    placedOn: b.placed_on ? String(b.placed_on) : null,
    dispatchedOn: b.dispatched_on ? String(b.dispatched_on) : null,
    deliveredOn: b.delivered_on ? String(b.delivered_on) : null,
  };
}
