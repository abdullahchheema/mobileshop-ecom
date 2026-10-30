"use client";

import Link from "@/components/i18n/link";
import { ChevronRightIcon, FlameIcon, MenuIcon, RefreshCwIcon, StoreIcon } from "lucide-react";
import { CategoryIcon } from "@/components/layout/category-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n } from "@/components/i18n/lang-provider";
import { categoryLabel } from "@/i18n";
import type { NavCategory } from "@/lib/catalog";

export function MobileNav({ categories }: { categories: NavCategory[] }) {
  const { t, lang } = useI18n();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label={t.header.menu}>
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side={lang === "ur" ? "right" : "left"} className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.header.shopByCategory}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-2 pb-6">
          <MenuLink href="/deals" icon={<FlameIcon className="size-5 text-primary" />} label={t.header.deals} />
          {categories.map((c) => (
            <div key={c.id} className="border-b py-1 last:border-0">
              <MenuLink
                href={`/l/${c.slug}`}
                icon={<CategoryIcon icon={c.icon} className="size-5 text-muted-foreground" />}
                label={categoryLabel(t, c.slug, c.name)}
              />
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {c.children.map((child) => (
                  <SheetClose asChild key={child.id}>
                    <Link
                      href={`/l/${child.slug}`}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium hover:bg-accent"
                    >
                      {child.name}
                    </Link>
                  </SheetClose>
                ))}
              </div>
            </div>
          ))}
          <MenuLink href="/trade-in" icon={<RefreshCwIcon className="size-5 text-muted-foreground" />} label={t.header.tradeIn} />
          <MenuLink href="/sell" icon={<StoreIcon className="size-5 text-muted-foreground" />} label={t.header.sell} />
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function MenuLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <SheetClose asChild>
      <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-3 font-medium hover:bg-secondary">
        {icon}
        <span className="flex-1">{label}</span>
        <ChevronRightIcon className="size-4 text-muted-foreground rtl:-scale-x-100" />
      </Link>
    </SheetClose>
  );
}
