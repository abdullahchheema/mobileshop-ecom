import { cacheLife } from "next/cache";
import { BadgeCheckIcon, ShieldCheckIcon, TruckIcon, Undo2Icon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Logo } from "@/components/layout/logo";
import type { Lang } from "@/i18n/config";
import { categoryLabel, type Dict, getDict } from "@/i18n";
import { getNavCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

const columns = (t: Dict) => [
  {
    title: t.footer.help,
    links: [
      { label: t.footer.links.helpCenter, href: "/help" },
      { label: t.footer.links.track, href: "/orders" },
      { label: t.footer.links.shipping, href: "/help/shipping" },
      { label: t.footer.links.returns, href: "/help/returns" },
      { label: t.footer.links.warranty, href: "/help/warranty" },
      { label: t.footer.links.cod, href: "/help/cash-on-delivery" },
    ],
  },
  {
    title: t.footer.sell,
    links: [
      { label: t.footer.links.tradeIn, href: "/trade-in" },
    ],
  },
  {
    title: t.footer.company,
    links: [
      { label: t.footer.links.about, href: "/about" },
      { label: t.footer.links.promise, href: "/promise" },
      { label: t.footer.links.journal, href: "/journal" },
      { label: t.footer.links.terms, href: "/legal/terms" },
      { label: t.footer.links.privacy, href: "/legal/privacy" },
    ],
  },
];

export async function Footer({ lang }: { lang: Lang }) {
  const categories = await getNavCategories();
  const t = getDict(lang);
  const payments = [t.checkout.cod];

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
        <Perk icon={<ShieldCheckIcon />} title={t.common.monthWarranty(site.warrantyMonths)} text={t.footer.perks.warranty} />
        <Perk icon={<Undo2Icon />} title={t.common.dayReturns(site.returnDays)} text={t.footer.perks.returns} />
        <Perk icon={<BadgeCheckIcon />} title={t.footer.perks.verified} text={t.footer.perks.inspection(site.inspectionPoints)} />
        <Perk icon={<TruckIcon />} title={t.footer.perks.delivery} text={t.footer.perks.cod} />
      </div>

      <div className="border-t">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-1">
            <Logo />
            <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>

          <FooterColumn
            title={t.footer.shop}
            links={categories.map((c) => ({ label: categoryLabel(t, c.slug, c.name), href: `/l/${c.slug}` }))}
          />
          {columns(t).map((col) => (
            <FooterColumn key={col.title} {...col} />
          ))}
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <ul className="flex flex-wrap gap-2" aria-label={t.footer.payments}>
            {payments.map((p) => (
              <li key={p} className="rounded-md border bg-background px-2 py-1 font-medium text-foreground/80">
                {p}
              </li>
            ))}
          </ul>
          <p className="md:ms-auto">{t.footer.copyright(await copyrightYear(), site.name)}</p>
        </div>
      </div>

      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-3 text-center text-[11px] text-muted-foreground/80">
          {t.footer.developedBy}{" "}
          <a href="https://covison.com" target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 transition-colors hover:text-foreground hover:underline">
            Covison.com
          </a>
        </p>
      </div>
    </footer>
  );
}

function Perk({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-primary [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="hover:text-foreground hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Reading the clock must be cached under Cache Components.
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
