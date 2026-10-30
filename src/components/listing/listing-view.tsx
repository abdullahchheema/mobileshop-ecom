import Link from "@/components/i18n/link";
import { SearchXIcon, XIcon } from "lucide-react";
import { type Crumb, Breadcrumbs } from "@/components/listing/breadcrumbs";
import { FilterPanel } from "@/components/listing/filter-panel";
import { MobileFilters, SortSelect } from "@/components/listing/listing-controls";
import { TrustStrip } from "@/components/listing/trust-strip";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import type { Facets, ProductCardData } from "@/lib/catalog";
import { type ListingFilters, listingHref, productQuery, SORTS, type SortKey, toggleListValue } from "@/lib/listing-params";
import type { Lang } from "@/i18n/config";
import { categoryLabel, type Dict, getDict } from "@/i18n";
import { formatPkr } from "@/lib/site";

type RawParams = Record<string, string | string[] | undefined>;

type Props = {
  pathname: string;
  params: RawParams;
  filters: ListingFilters;
  facets: Facets;
  listing: { items: ProductCardData[]; total: number; page: number; pageCount: number };
  title: string;
  description?: string | null;
  breadcrumbs: Crumb[];
  subcategories?: { name: string; slug: string }[];
  lang: Lang;
};

export function ListingView({ pathname, params, filters, facets, listing, title, description, breadcrumbs, subcategories, lang }: Props) {
  const t = getDict(lang);
  const chips = activeChips(pathname, params, filters, facets, t);
  const sortHrefs = Object.fromEntries(
    SORTS.map((s) => [s.key, listingHref(pathname, params, { sort: s.key === "popular" ? null : s.key })]),
  ) as Record<SortKey, string>;
  const query = productQuery(filters);
  const panel = <FilterPanel pathname={pathname} params={params} facets={facets} lang={lang} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <Breadcrumbs items={breadcrumbs} />
      <TrustStrip lang={lang} />

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {description && <p className="max-w-3xl text-muted-foreground">{description}</p>}
        {subcategories && subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {subcategories.map((c) => (
              <Link
                key={c.slug}
                href={`/l/${c.slug}`}
                className="rounded-full border bg-background px-4 py-1.5 text-sm font-medium hover:border-primary hover:text-primary"
              >
                {categoryLabel(t, c.slug, c.name)}
              </Link>
            ))}
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block" aria-label={t.listing.filters}>
          {panel}
        </aside>

        <section aria-label={t.common.products(listing.total)} data-listing className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <MobileFilters activeCount={chips.length}>{panel}</MobileFilters>
            <p className="text-sm text-muted-foreground">
              {t.common.products(listing.total)}
            </p>
            <div className="ms-auto">
              <SortSelect value={filters.sort} hrefs={sortHrefs} />
            </div>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.label}
                  href={chip.href}
                  scroll={false}
                  className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground hover:bg-accent/70"
                >
                  {chip.label}
                  <XIcon className="size-3.5" aria-label={t.listing.removeFilter} />
                </Link>
              ))}
              <Link href={listingHref(pathname, { q: params.q, sort: params.sort }, {})} className="text-sm font-medium underline">
                {t.listing.clearAll}
              </Link>
            </div>
          )}

          {listing.items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {listing.items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} query={query} lang={lang} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
              <SearchXIcon className="size-10 text-muted-foreground" />
              <p className="mt-4 font-semibold">{t.listing.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.listing.emptyText}</p>
              {chips.length > 0 && (
                <Button asChild variant="outline" className="mt-6">
                  <Link href={listingHref(pathname, { q: params.q }, {})}>{t.listing.clearFilters}</Link>
                </Button>
              )}
            </div>
          )}

          <Pagination pathname={pathname} params={params} page={listing.page} pageCount={listing.pageCount} t={t} />
        </section>
      </div>
    </div>
  );
}

function activeChips(pathname: string, params: RawParams, filters: ListingFilters, facets: Facets, t: Dict) {
  const chips: { label: string; href: string }[] = [];
  const add = (key: string, values: string[], labelFor: (v: string) => string) => {
    for (const v of values) chips.push({ label: labelFor(v), href: listingHref(pathname, params, { [key]: toggleListValue(params[key], v) }) });
  };
  const lookup = (list: { label: string; value: string }[]) => (v: string) => list.find((i) => i.value === v)?.label ?? v;

  add("condition", filters.conditions, (v) => t.conditions[v]?.label ?? lookup(facets.conditions)(v));
  add("brand", filters.brands, lookup(facets.brands));
  add("storage", filters.storages, lookup(facets.storages));
  add("year", filters.years.map(String), (v) => v);
  if (filters.ptaOnly) chips.push({ label: t.listing.ptaChip, href: listingHref(pathname, params, { pta: null }) });
  if (filters.minPrice || filters.maxPrice) {
    const label = `${filters.minPrice ? formatPkr(filters.minPrice) : formatPkr(0)} – ${filters.maxPrice ? formatPkr(filters.maxPrice) : t.listing.any}`;
    chips.push({ label, href: listingHref(pathname, params, { min: null, max: null }) });
  }
  return chips;
}

function Pagination({ pathname, params, page, pageCount, t }: { pathname: string; params: RawParams; page: number; pageCount: number; t: Dict }) {
  if (pageCount <= 1) return null;
  const href = (p: number) => listingHref(pathname, params, { page: p > 1 ? String(p) : null });
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-6">
      {page > 1 && (
        <Button asChild variant="outline">
          <Link href={href(page - 1)}>{t.common.previous}</Link>
        </Button>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button asChild variant={p === page ? "default" : "ghost"} size="icon-lg">
            <Link href={href(p)} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          </Button>
        </span>
      ))}
      {page < pageCount && (
        <Button asChild variant="outline">
          <Link href={href(page + 1)}>{t.common.next}</Link>
        </Button>
      )}
    </nav>
  );
}

export function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6" aria-busy="true">
      <div className="h-4 w-48 animate-pulse rounded bg-secondary" />
      <div className="h-12 animate-pulse rounded-2xl bg-secondary" />
      <div className="h-10 w-72 animate-pulse rounded bg-secondary" />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden h-96 animate-pulse rounded-2xl bg-secondary lg:block" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      </div>
    </div>
  );
}
