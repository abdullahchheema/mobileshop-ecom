"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { returnAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { returnActions, type ReturnStatus } from "@/lib/returns";
import { formatPkr } from "@/lib/site";

const input = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";

/** `cardRefund`: paid by card, so the refund goes back through the gateway automatically. */
export function ReturnActions({
  id,
  status,
  refundAmount,
  cardRefund,
}: {
  id: string;
  status: ReturnStatus;
  refundAmount: number;
  cardRefund: boolean;
}) {
  const [note, setNote] = useState("");
  const [refundRef, setRefundRef] = useState("");
  const [pending, start] = useTransition();
  const actions = returnActions(status);
  if (actions.length === 0) return null;

  const run = (action: "approve" | "reject" | "receive" | "refund", success: string) =>
    start(async () => {
      const result = await returnAction({ id, action, note, refundRef });
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });

  return (
    <div className="space-y-2 rounded-xl bg-secondary/50 p-3">
      {(actions.includes("approve") || actions.includes("reject")) && (
        <input
          aria-label="Note to the buyer"
          placeholder={actions.includes("approve") ? "Note to the buyer (required to reject)" : "Reason (required to reject)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={input}
        />
      )}
      {actions.includes("refund") && !cardRefund && (
        <input
          aria-label="Refund reference"
          placeholder={`Transfer reference for the ${formatPkr(refundAmount)} refund`}
          value={refundRef}
          onChange={(e) => setRefundRef(e.target.value)}
          className={input}
        />
      )}
      <div className="flex flex-wrap gap-2">
        {actions.includes("approve") && (
          <Button size="sm" disabled={pending} onClick={() => run("approve", "Return approved")}>
            Approve return
          </Button>
        )}
        {actions.includes("receive") && (
          <Button size="sm" disabled={pending} onClick={() => run("receive", "Marked as received")}>
            Device received
          </Button>
        )}
        {actions.includes("refund") && (
          <Button
            size="sm"
            disabled={pending || (!cardRefund && refundRef.trim().length < 4)}
            onClick={() => run("refund", cardRefund ? "Refunded to the buyer's card" : "Refund recorded")}
          >
            {cardRefund ? `Refund ${formatPkr(refundAmount)} to card` : "Mark refunded"}
          </Button>
        )}
        {actions.includes("reject") && (
          <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => run("reject", "Return rejected")}>
            Reject
          </Button>
        )}
      </div>
    </div>
  );
}
