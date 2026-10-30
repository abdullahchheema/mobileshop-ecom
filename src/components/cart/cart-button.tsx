import { ShoppingBagIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getCartCount } from "@/lib/cart";
import { currentCartOwner } from "@/lib/cart-owner";

/** Header cart icon with item count. Reads cookies/session, so render inside <Suspense>. */
export async function CartButton({ lang }: { lang: Lang }) {
  const count = await getCartCount(await currentCartOwner());
  return <CartLink count={count} lang={lang} />;
}

export function CartLink({ count = 0, lang }: { count?: number; lang: Lang }) {
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
