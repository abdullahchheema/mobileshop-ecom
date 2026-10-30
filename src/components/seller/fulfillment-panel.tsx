"use client";

import { useState, useTransition } from "react";
import { CheckIcon, PackageCheckIcon, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { fulfillmentAction } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allowedActions, COURIERS, type FulfillmentStatus } from "@/lib/fulfillment";

/** The next step(s) a seller can take on one shipment. */
export function FulfillmentPanel({ sellerOrderId, status }: { sellerOrderId: string; status: FulfillmentStatus }) {
  const [courier, setCourier] = useState<(typeof COURIERS)[number]>(COURIERS[0]);
  const [tracking, setTracking] = useState("");
  const [pending, start] = useTransition();
  const actions = allowedActions(status);

  const run = (input: Parameters<typeof fulfillmentAction>[1], success: string) =>
    start(async () => {
      const result = await fulfillmentAction(sellerOrderId, input);
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });

  if (actions.length === 0) return null;

  return (
    <section className="space-y-4 rounded-2xl border bg-background p-5">
      <h2 className="font-semibold">Next step</h2>

      {actions.includes("confirm") && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Check the device is in stock and matches the listing, then confirm. The buyer is notified by SMS.
          </p>
          <Button disabled={pending} onClick={() => run({ action: "confirm" }, "Order confirmed")}>
            <CheckIcon data-icon="inline-start" /> Confirm order
          </Button>
        </div>
      )}

      {actions.includes("ship") && (
        <form
          method="post"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run({ action: "ship", courier, trackingNumber: tracking }, "Marked as shipped");
          }}
        >
          <p className="text-sm text-muted-foreground">Hand the parcel to your courier, then add the tracking number.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="courier">Courier</Label>
              <select
                id="courier"
                value={courier}
                onChange={(e) => setCourier(e.target.value as (typeof COURIERS)[number])}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {COURIERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking number</Label>
              <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} className="h-11" required />
            </div>
          </div>
          <Button type="submit" disabled={pending || tracking.trim().length < 4}>
            <TruckIcon data-icon="inline-start" /> Mark as shipped
          </Button>
        </form>
      )}

      {actions.includes("deliver") && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Mark as delivered once the courier confirms delivery and cash collection.</p>
          <Button disabled={pending} onClick={() => run({ action: "deliver" }, "Marked as delivered")}>
            <PackageCheckIcon data-icon="inline-start" /> Mark as delivered
          </Button>
        </div>
      )}

      {actions.includes("cancel") && (
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => {
              if (window.confirm("Cancel your part of this order? The buyer won't be charged for it and the stock goes back on sale.")) {
                run({ action: "cancel" }, "Order cancelled");
              }
            }}
          >
            I can&apos;t fulfil this order
          </Button>
        </div>
      )}
    </section>
  );
}
