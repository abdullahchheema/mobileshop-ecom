"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BanknoteIcon, CreditCardIcon, LockIcon, PlusIcon, WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { placeOrderAction } from "@/app/actions/orders";
import { AddressForm } from "@/components/account/address-form";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/i18n";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

type AddressOption = { id: string; isDefault: boolean; lines: React.ReactNode };
type Method = "COD" | "CARD" | "JAZZCASH" | "EASYPAISA";

const methods = (t: Dict, card: CardPayment) => [
  {
    value: "COD" as Method,
    label: t.checkout.cod,
    detail: t.checkout.codDetail,
    icon: <BanknoteIcon />,
    enabled: true,
  },
  {
    value: "CARD" as Method,
    label: card?.label ?? t.checkout.card,
    detail: card ? t.checkout.cardDetail : t.checkout.comingSoon,
    icon: <CreditCardIcon />,
    enabled: Boolean(card),
  },
  { value: "JAZZCASH" as Method, label: "JazzCash", detail: t.checkout.comingSoon, icon: <WalletIcon />, enabled: false },
  { value: "EASYPAISA" as Method, label: "Easypaisa", detail: t.checkout.comingSoon, icon: <WalletIcon />, enabled: false },
];

/** Card payment details when a gateway is configured, else null. */
type CardPayment = { label: string; windowMinutes: number } | null;

export function CheckoutForm({
  addresses,
  total,
  card,
  children,
}: {
  addresses: AddressOption[];
  total: number;
  card: CardPayment;
  /** Server-rendered order review, shown between payment and the button. */
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t, href } = useI18n();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null);
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [method, setMethod] = useState<Method>("COD");
  const [placing, start] = useTransition();

  function placeOrder() {
    if (!addressId) {
      toast.error(t.checkout.needAddress);
      return;
    }
    start(async () => {
      // On success the action redirects to the order page, so only errors return here.
      const result = await placeOrderAction({ addressId, paymentMethod: method, expectedTotal: total });
      if (!result) return;
      toast.error(result.error);
      if (["PRICE_CHANGED", "OUT_OF_STOCK", "ITEMS_UNAVAILABLE", "EMPTY_CART"].includes(result.code)) {
        router.push(href("/cart"));
      }
    });
  }

  return (
    <div className="space-y-8">
      <Step number={1} title={t.checkout.address}>
        {addresses.length > 0 && (
          <div role="radiogroup" aria-label={t.checkout.address} className="grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border p-4 text-start transition",
                  a.id === addressId ? "border-primary bg-accent ring-2 ring-primary/20" : "hover:border-foreground/30",
                )}
              >
                <input
                  type="radio"
                  name="address"
                  className="mt-1 accent-[var(--primary)]"
                  checked={a.id === addressId}
                  onChange={() => setAddressId(a.id)}
                />
                {a.lines}
              </label>
            ))}
          </div>
        )}
        {addingAddress ? (
          <div className="mt-4 rounded-2xl border p-5">
            <AddressForm
              showDefaultToggle={addresses.length > 0}
              onSaved={(id) => {
                setAddressId(id);
                setAddingAddress(false);
              }}
              onCancel={addresses.length > 0 ? () => setAddingAddress(false) : undefined}
            />
          </div>
        ) : (
          <Button variant="outline" className="mt-4" onClick={() => setAddingAddress(true)}>
            <PlusIcon data-icon="inline-start" /> {t.checkout.newAddress}
          </Button>
        )}
      </Step>

      <Step number={2} title={t.checkout.payment}>
        <div role="radiogroup" aria-label={t.checkout.payment} className="grid gap-3 sm:grid-cols-2">
          {methods(t, card).map((m) => (
            <label
              key={m.value}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 transition",
                !m.enabled && "cursor-not-allowed opacity-50",
                m.enabled && "cursor-pointer",
                m.value === method && "border-primary bg-accent ring-2 ring-primary/20",
              )}
            >
              <input
                type="radio"
                name="payment"
                className="accent-[var(--primary)]"
                disabled={!m.enabled}
                checked={m.value === method}
                onChange={() => setMethod(m.value)}
              />
              <span className="text-primary [&_svg]:size-5">{m.icon}</span>
              <span>
                <span className="block text-sm font-semibold">{m.label}</span>
                <span className="block text-xs text-muted-foreground">{m.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </Step>

      <Step number={3} title={t.checkout.review}>
        {children}
      </Step>

      <div className="rounded-2xl border bg-secondary/50 p-5">
        <Button size="lg" className="h-12 w-full text-base" disabled={placing || !addressId} onClick={placeOrder}>
          <LockIcon data-icon="inline-start" />
          {placing
            ? t.checkout.placing
            : method === "COD"
              ? t.checkout.placeOrder(formatPkr(total))
              : t.checkout.continueToPayment(formatPkr(total))}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {method === "COD" && t.checkout.codNote(formatPkr(total))}
          {method === "CARD" && card && t.checkout.cardNote(card.windowMinutes)}
          {t.checkout.terms}
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-3 text-xl font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
