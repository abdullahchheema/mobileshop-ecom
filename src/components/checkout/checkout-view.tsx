"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { CartLines, OrderSummaryRows } from "@/components/cart/cart-lines";
import { useCartView } from "@/components/cart/use-cart-view";
import { Field, FieldError } from "@/components/form/field";
import { useI18n } from "@/components/i18n/lang-provider";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { clearCart, rememberOrder } from "@/lib/cart-store";
import { CITIES, PROVINCES } from "@/lib/pakistan";
import { isPrepaid, PAYMENT_METHODS, type PaymentMethod } from "@/lib/payment";
import { formatPkr } from "@/lib/site";

type Errors = Partial<Record<string, string[]>>;
const FIELDS = ["name", "phone", "email", "line1", "line2", "city", "province", "notes", "paymentReference"] as const;

/** A short id for this checkout, created once per attempt and kept until the order succeeds. A retry sends the same id. */
function forgetCheckoutId() {
  try {
    window.sessionStorage.removeItem("trendz-checkout-id");
  } catch {
    // ignore
  }
}

function checkoutId() {
  const key = "trendz-checkout-id";
  try {
    const found = window.sessionStorage.getItem(key);
    if (found) return found;
    const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  }
}

export function CheckoutView() {
  const router = useRouter();
  const { t, href } = useI18n();
  const { cart, loading, failed, items, reload } = useCartView();
  const [province, setProvince] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [placing, setPlacing] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("Cash on Delivery");
  const cityList = useId();
  // Set once the order exists: the cart is emptied right after, and that must not bounce the customer back to the cart.
  const orderPlaced = useRef(false);

  // Nothing to check out: back to the cart.
  useEffect(() => {
    if (!loading && cart && cart.lines.length === 0 && !orderPlaced.current) router.replace(href("/cart"));
  }, [loading, cart, router, href]);

  if (loading && !cart) return <div className="h-96 animate-pulse rounded-2xl bg-secondary" />;
  if (failed && !cart) return <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">{t.checkout.unavailable}</p>;
  if (!cart || cart.lines.length === 0) return null;
  const total = cart.totals.total;

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (placing || !cart) return;
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");
    setPlacing(true);
    setErrors({});
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: checkoutId(),
          items,
          expectedTotal: total,
          paymentMethod: method,
          website: value("website"),
          ...Object.fromEntries(FIELDS.map((f) => [f, value(f)])),
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.status === 201) {
        const order = body.order as { ref: string; total: number };
        rememberOrder({ ref: order.ref, total: order.total || total, placedAt: new Date().toISOString() });
        forgetCheckoutId();
        orderPlaced.current = true;
        clearCart();
        router.push(`${href("/order")}/${encodeURIComponent(order.ref)}?placed=1`);
        return;
      }
      const code = String(body?.error?.code ?? "");
      const message = String(body?.error?.message ?? t.checkout.unavailable);
      if (code === "PRICE_CHANGED" || code === "OUT_OF_STOCK" || code === "CONFLICT") {
        toast.error(t.checkout.stockChanged, { description: message });
        // The cart is about to change, so this is a different order: it gets a new number. (A network error or a
        // 5xx keeps the same one, so retrying can never create a second order.)
        forgetCheckoutId();
        await reload();
        router.push(href("/cart"));
      } else if (code === "INVALID") {
        // Show the message under the field it is about (the server's wording names the field).
        const about: Record<(typeof FIELDS)[number], RegExp> = { name: /name/i, phone: /mobile|phone/i, email: /email/i, line1: /address|house|street/i, line2: /landmark/i, city: /city/i, province: /province/i, notes: /notes/i, paymentReference: /reference|transaction/i };
        const field = FIELDS.find((f) => about[f].test(message));
        setErrors(field ? { [field]: [message] } : {});
        toast.error(message);
      } else {
        toast.error(message);
      }
    } catch {
      toast.error(t.checkout.unavailable);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <form onSubmit={placeOrder} noValidate className="space-y-8">
        <section>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Step n={1} />
            {t.checkout.details}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.address.fullName} name="name" error={errors.name} autoComplete="name" required />
            <Field label={t.address.phone} name="phone" error={errors.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" required />
            <Field label={t.checkout.email} name="email" error={errors.email} type="email" autoComplete="email" className="sm:col-span-2" />
            <Field label={t.address.line1} name="line1" error={errors.line1} autoComplete="address-line1" placeholder={t.address.line1Placeholder} className="sm:col-span-2" required />
            <Field label={t.address.line2} name="line2" error={errors.line2} autoComplete="address-line2" placeholder={t.address.line2Placeholder} className="sm:col-span-2" />
            <Field
              label={t.address.city}
              name="city"
              error={errors.city}
              autoComplete="address-level2"
              list={cityList}
              required
              onChange={(e) => {
                const match = CITIES.find((c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase());
                if (match) setProvince(match.province);
              }}
            />
            <datalist id={cityList}>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
            <div className="space-y-2">
              <Label htmlFor="province">{t.address.province}</Label>
              <select
                id="province"
                name="province"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                aria-invalid={Boolean(errors.province)}
                required
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm aria-invalid:border-destructive"
              >
                <option value="" disabled>
                  {t.address.chooseProvince}
                </option>
                {PROVINCES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {t.address.provinces[p.value] ?? p.label}
                  </option>
                ))}
              </select>
              <FieldError messages={errors.province} />
            </div>
            <Field label={t.checkout.notes} name="notes" error={errors.notes} placeholder={t.checkout.notesPlaceholder} className="sm:col-span-2" maxLength={300} />
            {/* Honeypot: hidden from people, filled in by spam bots. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          </div>
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Step n={2} />
            {t.checkout.payment}
          </h2>
          <div role="radiogroup" aria-label={t.checkout.payment} className="space-y-2">
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${method === m ? "border-primary bg-accent ring-2 ring-primary/20" : ""}`}
              >
                <input type="radio" name="paymentMethod" value={m} checked={method === m} onChange={() => setMethod(m)} className="size-4 accent-primary" />
                <span>
                  <span className="block text-sm font-semibold">{t.checkout.paymentMethod[m] ?? m}</span>
                  {m === "Cash on Delivery" && <span className="block text-xs text-muted-foreground">{t.checkout.codDetail}</span>}
                </span>
              </label>
            ))}
          </div>
          {isPrepaid(method) && (
            <div className="mt-3 space-y-3">
              <p className="rounded-xl bg-secondary px-4 py-3 text-sm">{t.checkout.prepaidNote}</p>
              <Field label={t.checkout.paymentReference} name="paymentReference" error={errors.paymentReference} maxLength={80} />
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
            <Step n={3} />
            {t.checkout.review}
          </h2>
          <CartLines cart={cart} t={t} editable={false} />
          <p className="mt-2 text-sm">
            <Link href="/cart" className="text-primary hover:underline">
              {t.cart.title}
            </Link>
          </p>
        </section>

        <div className="rounded-2xl border bg-secondary/50 p-5">
          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={placing || cart.hasUnavailable}>
            <LockIcon data-icon="inline-start" />
            {placing ? t.checkout.placing : t.checkout.placeOrder(formatPkr(total))}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {isPrepaid(method) ? "" : t.checkout.codNote(formatPkr(total))}
            {t.checkout.terms}
          </p>
        </div>
      </form>

      <aside className="lg:sticky lg:top-36 lg:self-start">
        <div className="rounded-2xl border p-5">
          <h2 className="mb-4 font-bold">{t.checkout.summary}</h2>
          <OrderSummaryRows t={t} {...cart.totals} />
        </div>
      </aside>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">{n}</span>;
}
