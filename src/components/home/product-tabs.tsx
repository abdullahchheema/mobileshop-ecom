"use client";

import { useState } from "react";
import { ProductCarousel } from "@/components/product/product-rail";
import type { Lang } from "@/i18n/config";
import type { ProductCardData } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Tab = { id: string; label: string; icon: React.ReactNode; products: ProductCardData[] };

/** Chips that switch between product rows; the chips share a line with the arrows. */
export function ProductTabs({ label, lang, tabs }: { label: string; lang: Lang; tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  const chips = (
    <div role="tablist" aria-label={label} className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => setActive(tab.id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition [&_svg]:size-3.5",
            tab.id === active ? "border-transparent bg-lilac text-accent-foreground" : "bg-card hover:border-foreground/30",
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );

  return tabs.map((tab) => (
    <div key={tab.id} role="tabpanel" hidden={tab.id !== active}>
      <ProductCarousel label={tab.label} products={tab.products} lang={lang} heading={chips} />
    </div>
  ));
}
