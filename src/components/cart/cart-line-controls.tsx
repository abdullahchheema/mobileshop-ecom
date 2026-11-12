"use client";

import { Trash2Icon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { removeLine, setQuantity } from "@/lib/cart-store";

export function CartLineControls({ itemKey, quantity, maxQuantity, available }: { itemKey: string; quantity: number; maxQuantity: number; available: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      {available && (
        <select
          aria-label={t.cart.quantity}
          value={quantity}
          onChange={(e) => setQuantity(itemKey, Number(e.target.value))}
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {Array.from({ length: Math.max(maxQuantity, quantity) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {t.common.qty(n)}
            </option>
          ))}
        </select>
      )}
      <Button variant="ghost" size="sm" onClick={() => removeLine(itemKey)} className="text-muted-foreground hover:text-destructive">
        <Trash2Icon data-icon="inline-start" /> {t.common.remove}
      </Button>
    </div>
  );
}
