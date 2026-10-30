import { BanknoteIcon, HeadsetIcon, ShieldCheckIcon, Undo2Icon } from "lucide-react";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import { site } from "@/lib/site";

export function TrustStrip({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const items = [
    { icon: ShieldCheckIcon, text: t.common.monthWarranty(site.warrantyMonths) },
    { icon: BanknoteIcon, text: t.listing.trust.cod },
    { icon: Undo2Icon, text: t.common.dayReturns(site.returnDays) },
    { icon: HeadsetIcon, text: t.listing.trust.support },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm md:grid-cols-4">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 font-medium">
          <Icon className="size-4.5 shrink-0 text-primary" />
          {text}
        </li>
      ))}
    </ul>
  );
}
