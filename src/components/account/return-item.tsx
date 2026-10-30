"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { requestReturnAction } from "@/app/actions/orders";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { RETURN_REASONS } from "@/lib/returns";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

type Latest = { status: string; resolution: string | null; refundAmount: number | null } | null;

export function ReturnItem({ orderItemId, canReturn, latest }: { orderItemId: string; canReturn: boolean; latest: Latest }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  const { t } = useI18n();

  return (
    <div className="mt-1 space-y-2">
      {latest && (
        <p
          className={cn(
            "inline-block rounded-lg px-2 py-1 text-xs font-medium",
            latest.status === "REJECTED" ? "bg-destructive/10 text-destructive" : latest.status === "REFUNDED" ? "bg-mint text-savings" : "bg-sky",
          )}
        >
          {t.orders.returns.status[latest.status]}
          {latest.status === "REFUNDED" && latest.refundAmount !== null && ` · ${formatPkr(latest.refundAmount)}`}
          {latest.resolution && ` · ${latest.resolution}`}
        </p>
      )}

      {canReturn && !open && (
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen(true)}>
          {t.orders.returns.action}
        </Button>
      )}

      {open && (
        <form
          method="post"
          className="space-y-2 rounded-xl border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = await requestReturnAction({ orderItemId, reason: reason as (typeof RETURN_REASONS)[number], details });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              toast.success(t.orders.returns.requested);
              setOpen(false);
            });
          }}
        >
          <select
            required
            aria-label={t.orders.returns.why}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="" disabled>
              {t.orders.returns.why}
            </option>
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {t.orders.returns.reasons[r] ?? r}
              </option>
            ))}
          </select>
          <textarea
            aria-label={t.orders.returns.details}
            placeholder={t.orders.returns.details}
            rows={2}
            maxLength={500}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending || !reason}>
              {pending ? t.orders.returns.sending : t.orders.returns.request}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
