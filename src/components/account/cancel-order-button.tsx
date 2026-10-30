"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cancelOrderAction } from "@/app/actions/orders";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const { t } = useI18n();
  return (
    <Button
      variant="outline"
      disabled={pending}
      className="text-destructive hover:text-destructive"
      onClick={() => {
        if (!window.confirm(t.orders.cancelConfirm)) return;
        start(async () => {
          const result = await cancelOrderAction(orderId);
          if (result.ok) toast.success(t.orders.cancelled);
          else toast.error(result.error);
        });
      }}
    >
      {pending ? t.orders.cancelling : t.orders.cancelOrder}
    </Button>
  );
}
