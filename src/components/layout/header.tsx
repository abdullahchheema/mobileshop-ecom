import { Suspense } from "react";
import { CircleHelpIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { CartButton, CartLink } from "@/components/cart/cart-button";
import Link from "@/components/i18n/link";
import { CategoryNav } from "@/components/layout/category-nav";
import { LanguageLinks, LanguageSwitch } from "@/components/layout/language-switch";
import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBar } from "@/components/layout/search-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getNavCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

export async function Header({ lang }: { lang: Lang }) {
  const categories = await getNavCategories();
  const t = getDict(lang);

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="hidden text-xs text-foreground/80 md:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 pt-2">
          <Link href="/promise" className="flex items-center gap-1.5 hover:underline">
            <ShieldCheckIcon className="size-3.5" />
            {t.header.promise(site.warrantyMonths, site.returnDays)}
          </Link>
          <Link href="/sell" className="hover:underline">
            {t.header.sell}
          </Link>
          <Link href="/journal" className="hover:underline">
            {t.header.journal}
          </Link>
          <span className="ms-auto flex items-center gap-1.5">
            <MapPinIcon className="size-3.5" />
            {t.header.delivering}
          </span>
          <Suspense fallback={<LanguageLinks current={lang} path="/" />}>
            <LanguageSwitch current={lang} />
          </Suspense>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 md:gap-6">
        <MobileNav categories={categories} />
        <Logo />
        <SearchBar className="hidden flex-1 md:block" />
        <div className="ms-auto flex items-center gap-1 md:ms-0">
          <Button asChild variant="ghost" size="lg" className="hidden gap-2 px-2.5 lg:inline-flex">
            <Link href="/help">
              <CircleHelpIcon className="size-5" />
              {t.header.help}
            </Link>
          </Button>
          <Suspense fallback={<div className="mx-2 size-7 animate-pulse rounded-full bg-secondary" />}>
            <UserMenu lang={lang} />
          </Suspense>
          <Suspense fallback={<CartLink lang={lang} />}>
            <CartButton lang={lang} />
          </Suspense>
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>

      <CategoryNav categories={categories} lang={lang} />
    </header>
  );
}
