"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { adminCancelOrderAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function AdminCancelOrder({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      className="text-destructive"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Cancel this order for the buyer? Stock goes back on sale and the buyer gets an SMS.")) return;
        start(async () => {
          const result = await adminCancelOrderAction(orderId);
          if (result.ok) toast.success("Order cancelled");
          else toast.error(result.error);
        });
      }}
    >
      {pending ? "Cancelling…" : "Cancel order"}
    </Button>
  );
}
