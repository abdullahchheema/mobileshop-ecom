"use client";

import { useState, useTransition } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { saveSpecsAction } from "@/app/actions/admin-catalog";
import { Button } from "@/components/ui/button";

const input = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

export function SpecsEditor({ productId, specs }: { productId: string; specs: Record<string, string> }) {
  const [rows, setRows] = useState(() => {
    const entries = Object.entries(specs).map(([key, value]) => ({ key, value }));
    return entries.length ? entries : [{ key: "", value: "" }];
  });
  const [pending, start] = useTransition();

  const update = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <input aria-label="Spec name" placeholder="e.g. Display" value={row.key} onChange={(e) => update(i, { key: e.target.value })} className={`${input} w-40`} />
          <input aria-label="Spec value" placeholder="e.g. 6.1-inch OLED" value={row.value} onChange={(e) => update(i, { value: e.target.value })} className={`${input} flex-1`} />
          <Button variant="ghost" size="icon" aria-label="Remove spec" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
            <XIcon />
          </Button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={() => setRows((r) => [...r, { key: "", value: "" }])}>
          <PlusIcon data-icon="inline-start" /> Add spec
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveSpecsAction(productId, rows);
              if (result.ok) toast.success(result.message);
              else toast.error(result.error);
            })
          }
        >
          {pending ? "Saving…" : "Save specs"}
        </Button>
      </div>
    </div>
  );
}
