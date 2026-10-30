"use client";

import { useTransition } from "react";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { payOrderAction } from "@/app/actions/payments";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";

export function PayNowButton({ orderId, label }: { orderId: string; label: string }) {
  const [pending, start] = useTransition();
  const { t } = useI18n();
  return (
    <Button
      size="lg"
      className="rounded-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          // Success redirects to the payment page; only errors come back.
          const result = await payOrderAction(orderId);
          if (result && !result.ok) toast.error(result.error);
        })
      }
    >
      <LockIcon data-icon="inline-start" /> {pending ? t.orders.openingPayment : label}
    </Button>
  );
}
