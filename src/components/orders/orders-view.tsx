"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PackageIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type RecentOrder, recentOrders } from "@/lib/cart-store";
import { formatPkr } from "@/lib/site";

const NONE: RecentOrder[] = [];
let cache: { raw: string; value: RecentOrder[] } = { raw: "", value: NONE };
const snapshot = () => {
  const value = recentOrders();
  const raw = JSON.stringify(value);
  if (raw !== cache.raw) cache = { raw, value };
  return cache.value;
};
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

/** Orders placed on this device (kept in the browser) plus a form to track any order by its number. */
export function OrdersView() {
  const { t, href } = useI18n();
  const router = useRouter();
  const orders = useSyncExternalStore(subscribe, snapshot, () => NONE);
  const [ref, setRef] = useState("");

  return (
    <div className="space-y-8">
      <form
        className="space-y-3 rounded-2xl border p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const value = ref.trim();
          if (value) router.push(`${href("/order")}/${encodeURIComponent(value)}`);
        }}
      >
        <Label htmlFor="ref">{t.track.trackTitle}</Label>
        <div className="flex gap-2">
          <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t.track.refPlaceholder} className="h-11" />
          <Button type="submit" size="lg" disabled={!ref.trim()}>
            {t.track.trackButton}
          </Button>
        </div>
      </form>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">{t.track.none}</p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {orders.map((o) => (
            <li key={o.ref}>
              <Link href={`/order/${encodeURIComponent(o.ref)}`} className="flex items-center gap-4 p-4 hover:bg-secondary/50">
                <PackageIcon className="size-5 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{o.ref}</span>
                  <span className="block text-xs text-muted-foreground">{t.track.placed(new Date(o.placedAt).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }))}</span>
                </span>
                <span className="font-bold">{formatPkr(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
