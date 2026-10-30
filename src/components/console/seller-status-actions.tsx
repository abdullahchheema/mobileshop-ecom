"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setSellerStatusAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

const LABELS = { APPROVED: "Approved", REJECTED: "Rejected", SUSPENDED: "Suspended" } as const;

export function SellerStatusActions({ sellerId, status, shopName }: { sellerId: string; status: Status; shopName: string }) {
  const [pending, start] = useTransition();

  const set = (next: keyof typeof LABELS) =>
    start(async () => {
      if (next !== "APPROVED" && !window.confirm(`${next === "SUSPENDED" ? "Suspend" : "Reject"} ${shopName}?`)) return;
      const result = await setSellerStatusAction(sellerId, next);
      if (result.ok) toast.success(`${shopName}: ${LABELS[next].toLowerCase()}`);
      else toast.error(result.error);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {(status === "PENDING" || status === "REJECTED" || status === "SUSPENDED") && (
        <Button size="sm" disabled={pending} onClick={() => set("APPROVED")}>
          {status === "SUSPENDED" ? "Reinstate" : "Approve"}
        </Button>
      )}
      {status === "PENDING" && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => set("REJECTED")}>
          Reject
        </Button>
      )}
      {status === "APPROVED" && (
        <Button size="sm" variant="outline" className="text-destructive" disabled={pending} onClick={() => set("SUSPENDED")}>
          Suspend
        </Button>
      )}
    </div>
  );
}
