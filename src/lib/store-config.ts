import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment";

// The delivery pricing and the payment accounts are set by the online manager in the ERP. These are the pure types and rules; the server fetch lives
// in erp-config.ts and the browser reads them from /api/store-config.

export type PaymentAccount = { title: string; bankName: string; accountNumber: string; iban: string; instructions: string };
export type StoreConfig = {
  delivery: { fee: number; freeFrom: number | null; provinces: { province: string; fee: number }[] };
  paymentMethods: { method: PaymentMethod; accounts: PaymentAccount[] }[];
};

/** Used only while the ERP cannot be reached: the same numbers the store always used. The ERP re-checks the charge, so a wrong guess is refused, never accepted. */
export const DEFAULT_STORE_CONFIG: StoreConfig = {
  delivery: { fee: 250, freeFrom: 30000, provinces: [] },
  paymentMethods: PAYMENT_METHODS.map((method) => ({ method, accounts: [] })),
};

/** Delivery for an order: free from the free-delivery amount, else the province's own fee, else the default fee. */
export function deliveryFee(config: StoreConfig, subtotal: number, province?: string) {
  if (subtotal <= 0) return 0;
  const { fee, freeFrom, provinces } = config.delivery;
  if (freeFrom !== null && subtotal >= freeFrom) return 0;
  const own = province ? provinces.find((p) => p.province.toLowerCase() === province.toLowerCase()) : undefined;
  return own ? own.fee : fee;
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const text = (v: unknown) => (typeof v === "string" ? v : "");

/** Reads the ERP's /api/online/config/ answer. Anything unexpected becomes null so the caller falls back. */
export function parseStoreConfig(body: unknown): StoreConfig | null {
  const b = body as { delivery?: { fee?: unknown; free_from?: unknown; provinces?: { province?: unknown; fee?: unknown }[] }; payment_methods?: { method?: unknown; accounts?: Record<string, unknown>[] }[] } | null;
  const fee = money(b?.delivery?.fee);
  if (!b || fee === null || !Array.isArray(b.payment_methods)) return null;
  const freeFrom = b.delivery?.free_from === null || b.delivery?.free_from === undefined ? null : money(b.delivery.free_from);
  const provinces = (b.delivery?.provinces ?? []).flatMap((p) => {
    const f = money(p.fee);
    return typeof p.province === "string" && f !== null ? [{ province: p.province, fee: f }] : [];
  });
  const paymentMethods = b.payment_methods.flatMap((m) => {
    if (!(PAYMENT_METHODS as readonly string[]).includes(String(m.method))) return [];
    const accounts = (m.accounts ?? []).map((a) => ({ title: text(a.title), bankName: text(a.bank_name), accountNumber: text(a.account_number), iban: text(a.iban), instructions: text(a.instructions) }));
    return [{ method: m.method as PaymentMethod, accounts }];
  });
  return { delivery: { fee, freeFrom, provinces }, paymentMethods };
}
