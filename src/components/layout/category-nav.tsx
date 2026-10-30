import { FlameIcon, RefreshCwIcon, StoreIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { CategoryIcon } from "@/components/layout/category-icon";
import type { Lang } from "@/i18n/config";
import { categoryLabel, getDict } from "@/i18n";
import type { NavCategory } from "@/lib/catalog";

const linkClass = "flex shrink-0 items-center gap-1.5 py-2.5 text-sm whitespace-nowrap hover:underline";

/** Horizontal category bar under the header; scrolls sideways on small screens. */
export function CategoryNav({ categories, lang }: { categories: NavCategory[]; lang: Lang }) {
  const t = getDict(lang);
  return (
    <nav aria-label="Categories" className="border-b">
      <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 scrollbar-none">
        <Link href="/deals" className={`${linkClass} font-medium text-destructive`}>
          <FlameIcon className="size-4" />
          {t.header.deals}
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/l/${c.slug}`} className={linkClass}>
            <CategoryIcon icon={c.icon} className="size-4" />
            {categoryLabel(t, c.slug, c.name)}
          </Link>
        ))}
        <div className="ms-auto hidden items-center gap-6 lg:flex">
          <Link href="/trade-in" className={linkClass}>
            <RefreshCwIcon className="size-4" />
            {t.header.tradeIn}
          </Link>
          <Link href="/sell" className={linkClass}>
            <StoreIcon className="size-4" />
            {t.header.sell}
          </Link>
        </div>
      </div>
    </nav>
  );
}
