"use client";

import { useState } from "react";
import { BanknoteIcon, CheckIcon, CopyIcon, SmartphoneIcon } from "lucide-react";
import type { Dict } from "@/i18n";
import { ltr } from "@/i18n";
import type { PaymentAccount } from "@/lib/store-config";
import { formatPkr } from "@/lib/site";

/** A value the customer has to type into their banking app, with a button that copies it. */
function CopyRow({ label, value, t }: { label: string; value: string; t: Dict }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (older browser, insecure page): the number is still on screen to type.
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-all font-mono text-[15px] font-semibold tracking-wide" dir="ltr">
          {ltr(value)}
        </dd>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`${t.checkout.pay.copy}: ${label}`}
      >
        {copied ? <CheckIcon className="size-3.5 text-savings" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
        <span aria-live="polite">{copied ? t.checkout.pay.copied : t.checkout.pay.copy}</span>
      </button>
    </div>
  );
}

/** The shop's account for the chosen payment method: who to pay, how much, and what happens next. */
export function PaymentAccountCard({ method, account, total, t }: { method: string; account: PaymentAccount; total: number; t: Dict }) {
  const wallet = method === "Easypaisa" || method === "JazzCash";
  const Icon = wallet ? SmartphoneIcon : BanknoteIcon;
  return (
    <section className="overflow-hidden rounded-2xl border bg-card" aria-label={`${t.checkout.pay.payTo} ${t.checkout.paymentMethod[method] ?? method}`}>
      <header className="flex items-center gap-3 border-b bg-secondary/50 px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-mint text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{t.checkout.pay.payTo}</p>
          <p className="font-semibold">{t.checkout.paymentMethod[method] ?? method}</p>
        </div>
        <div className="ms-auto text-end">
          <p className="text-xs text-muted-foreground">{t.checkout.pay.amount}</p>
          <p className="font-bold tabular-nums">{formatPkr(total)}</p>
        </div>
      </header>
      <dl className="divide-y px-4">
        <div className="py-2.5">
          <dt className="text-xs text-muted-foreground">{t.checkout.pay.accountTitle}</dt>
          <dd className="font-semibold">{account.title}</dd>
        </div>
        {account.bankName && (
          <div className="py-2.5">
            <dt className="text-xs text-muted-foreground">{t.checkout.pay.bank}</dt>
            <dd className="font-semibold">{account.bankName}</dd>
          </div>
        )}
        {account.accountNumber && <CopyRow label={wallet ? t.checkout.pay.wallet : t.checkout.pay.accountNumber} value={account.accountNumber} t={t} />}
        {account.iban && <CopyRow label={t.checkout.pay.iban} value={account.iban} t={t} />}
      </dl>
      {account.instructions && <p className="border-t bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">{account.instructions}</p>}
      <ol className="space-y-1.5 border-t px-4 py-3 text-sm text-muted-foreground">
        {t.checkout.pay.steps.map((step, i) => (
          <li key={step} className="flex gap-2.5">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
