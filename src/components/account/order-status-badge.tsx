import type { Dict } from "@/i18n";
import { ORDER_STATUS } from "@/lib/order-status";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-secondary text-foreground",
  progress: "bg-sky text-ink",
  success: "bg-mint text-savings",
  danger: "bg-destructive/10 text-destructive",
};

/** Pass the storefront dictionary to translate the label; console pages leave it out. */
export function OrderStatusBadge({ status, t }: { status: string; t?: Dict }) {
  const { label, tone } = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {t?.orders.status[status] ?? label}
    </span>
  );
}
