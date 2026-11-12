"use client";

import { ShoppingBagIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import { useCartCount } from "@/lib/cart-store";

/** Header cart icon with the item count, read from this browser's cart. */
export function CartButton({ lang }: { lang: Lang }) {
  const count = useCartCount();
  return (
    <Button asChild variant="ghost" size="icon-lg" className="relative" aria-label={getDict(lang).header.cart(count)}>
      <Link href="/cart">
        <ShoppingBagIcon className="size-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -end-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
