"use client";

import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SORTS, type SortKey } from "@/lib/listing-params";

/** Sort dropdown. Each option carries its prebuilt URL from the server. */
export function SortSelect({ value, hrefs }: { value: SortKey; hrefs: Record<SortKey, string> }) {
  const router = useRouter();
  const { t, href } = useI18n();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted-foreground sm:inline">{t.listing.sortBy}</span>
      <select
        value={value}
        onChange={(e) => router.push(href(hrefs[e.target.value as SortKey]), { scroll: false })}
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm font-medium"
      >
        {SORTS.map((s) => (
          <option key={s.key} value={s.key}>
            {t.listing.sorts[s.key] ?? s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Mobile drawer wrapping the server-rendered filter panel. */
export function MobileFilters({ activeCount, children }: { activeCount: number; children: React.ReactNode }) {
  const { t, lang } = useI18n();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="lg:hidden">
          <SlidersHorizontalIcon data-icon="inline-start" />
          {t.listing.filters}
          {activeCount > 0 && ` (${activeCount})`}
        </Button>
      </SheetTrigger>
      <SheetContent side={lang === "ur" ? "right" : "left"} className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t.listing.filters}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
