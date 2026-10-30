"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { toast } from "sonner";
import { saveListingsAction } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";
import type { ListingRow } from "@/lib/seller-listings";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

type Editable = Pick<ListingRow, "price" | "stock" | "warrantyMonths"> & { status: "ACTIVE" | "PAUSED" };

/** Inline-editable listings. Changes are collected locally and saved together. */
export function ListingsTable({ rows }: { rows: ListingRow[] }) {
  const [edits, setEdits] = useState<Record<string, Editable>>({});
  const [saving, start] = useTransition();

  const current = (row: ListingRow): Editable =>
    edits[row.id] ?? {
      price: row.price,
      stock: row.stock,
      warrantyMonths: row.warrantyMonths,
      status: row.status === "PAUSED" ? "PAUSED" : "ACTIVE",
    };

  const change = (row: ListingRow, patch: Partial<Editable>) => setEdits((e) => ({ ...e, [row.id]: { ...current(row), ...patch } }));

  const dirty = rows.filter((r) => {
    const e = edits[r.id];
    return e && (e.price !== r.price || e.stock !== r.stock || e.warrantyMonths !== r.warrantyMonths || e.status !== r.status);
  });

  function save() {
    start(async () => {
      const result = await saveListingsAction(dirty.map((r) => ({ id: r.id, ...current(r) })));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Saved ${dirty.length} ${dirty.length === 1 ? "listing" : "listings"}`);
      setEdits({});
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border bg-background">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-secondary/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Device</th>
              <th className="px-3 py-3 font-medium">Your price (Rs)</th>
              <th className="px-3 py-3 font-medium">Lowest elsewhere</th>
              <th className="px-3 py-3 font-medium">Stock</th>
              <th className="px-3 py-3 font-medium">Warranty</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const v = current(row);
              const beaten = row.competitorLowest !== null && row.competitorLowest < v.price;
              return (
                <tr key={row.id} className={cn(edits[row.id] && dirty.includes(row) && "bg-mango/20")}>
                  <td className="px-4 py-3">
                    <Link href={row.href} target="_blank" className="flex items-center gap-1 font-semibold hover:text-primary">
                      {row.productName} <ExternalLinkIcon className="size-3" />
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.variantLabel}</p>
                  </td>
                  <td className="px-3 py-3">
                    <NumberInput label="Price" value={v.price} step={500} onChange={(price) => change(row, { price })} width="w-28" />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {row.competitorLowest === null ? (
                      <span className="text-xs text-muted-foreground">Only you</span>
                    ) : (
                      <span className={cn("text-xs", beaten ? "font-semibold text-destructive" : "text-savings")}>
                        {formatPkr(row.competitorLowest)}
                        {beaten ? " · cheaper" : " · you're lowest"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <NumberInput label="Stock" value={v.stock} onChange={(stock) => change(row, { stock })} width="w-16" />
                  </td>
                  <td className="px-3 py-3">
                    <select
                      aria-label="Warranty"
                      value={v.warrantyMonths}
                      onChange={(e) => change(row, { warrantyMonths: Number(e.target.value) })}
                      className="h-9 rounded-lg border border-input bg-background px-2"
                    >
                      {[12, 18, 24, 36].map((m) => (
                        <option key={m} value={m}>
                          {m} months
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => change(row, { status: v.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        v.status === "PAUSED"
                          ? "bg-secondary text-muted-foreground"
                          : v.stock === 0
                            ? "bg-destructive/10 text-destructive"
                            : "bg-mint text-savings",
                      )}
                      title="Click to pause or resume"
                    >
                      {v.status === "PAUSED" ? "Paused" : v.stock === 0 ? "Sold out" : "Live"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dirty.length > 0 && (
        <div className="sticky bottom-4 mt-4 flex items-center justify-between gap-4 rounded-2xl border bg-ink p-4 text-white shadow-xl">
          <p className="text-sm">
            {dirty.length} unsaved {dirty.length === 1 ? "change" : "changes"}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setEdits({})} disabled={saving}>
              Discard
            </Button>
            <Button className="bg-mango text-ink hover:bg-mango/90" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  width,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  width: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={label}
      min={0}
      step={step}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Math.round(Number(e.target.value))))}
      className={cn("h-9 rounded-lg border border-input bg-background px-2 tabular-nums", width)}
    />
  );
}
