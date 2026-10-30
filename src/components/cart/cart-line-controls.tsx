"use client";

import { useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { removeFromCartAction, updateQuantityAction } from "@/app/actions/cart";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";

export function CartLineControls({
  itemId,
  quantity,
  maxQuantity,
  available,
}: {
  itemId: string;
  quantity: number;
  maxQuantity: number;
  available: boolean;
}) {
  const [pending, start] = useTransition();
  const { t } = useI18n();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
    });

  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      {available && (
        <select
          aria-label={t.cart.quantity}
          value={quantity}
          disabled={pending}
          onChange={(e) => run(() => updateQuantityAction(itemId, Number(e.target.value)))}
          className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {Array.from({ length: Math.max(maxQuantity, quantity) }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {t.common.qty(n)}
            </option>
          ))}
        </select>
      )}
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run(() => removeFromCartAction(itemId))}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2Icon data-icon="inline-start" /> {t.common.remove}
      </Button>
    </div>
  );
}
