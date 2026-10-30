import Link from "@/components/i18n/link";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Facets } from "@/lib/catalog";
import { type Lang, localizePath } from "@/i18n/config";
import { getDict } from "@/i18n";
import { listingHref, toggleListValue } from "@/lib/listing-params";
import { cn } from "@/lib/utils";

type RawParams = Record<string, string | string[] | undefined>;

/** Link-based filters, so they work without JavaScript and every state has a URL. */
export function FilterPanel({ pathname, params, facets, lang }: { pathname: string; params: RawParams; facets: Facets; lang: Lang }) {
  const t = getDict(lang);
  const selected = (key: string) =>
    String(Array.isArray(params[key]) ? params[key]?.[0] : (params[key] ?? ""))
      .split(",")
      .filter(Boolean);

  return (
    <div className="space-y-7">
      <PriceFilter pathname={pathname} params={params} lang={lang} />

      {facets.conditions.length > 0 && (
        <FilterGroup title={t.listing.condition}>
          {facets.conditions.map((c) => (
            <FilterOption
              key={c.value}
              label={t.conditions[c.value]?.label ?? c.label}
              active={selected("condition").includes(c.value)}
              href={listingHref(pathname, params, { condition: toggleListValue(params.condition, c.value) })}
            />
          ))}
        </FilterGroup>
      )}

      {facets.hasPta && (
        <FilterGroup title={t.listing.pta}>
          <FilterOption
            label={t.listing.ptaOnly}
            active={params.pta === "1"}
            href={listingHref(pathname, params, { pta: params.pta === "1" ? null : "1" })}
          />
        </FilterGroup>
      )}

      {facets.brands.length > 1 && (
        <FilterGroup title={t.listing.brand}>
          {facets.brands.map((b) => (
            <FilterOption
              key={b.value}
              label={b.label}
              active={selected("brand").includes(b.value)}
              href={listingHref(pathname, params, { brand: toggleListValue(params.brand, b.value) })}
            />
          ))}
        </FilterGroup>
      )}

      {facets.storages.length > 0 && (
        <FilterGroup title={t.listing.storage}>
          {facets.storages.map((s) => (
            <FilterOption
              key={s.value}
              label={s.label}
              active={selected("storage").includes(s.value)}
              href={listingHref(pathname, params, { storage: toggleListValue(params.storage, s.value) })}
            />
          ))}
        </FilterGroup>
      )}

      {facets.years.length > 0 && (
        <FilterGroup title={t.listing.year}>
          {facets.years.map((y) => (
            <FilterOption
              key={y}
              label={String(y)}
              active={selected("year").includes(String(y))}
              href={listingHref(pathname, params, { year: toggleListValue(params.year, String(y)) })}
            />
          ))}
        </FilterGroup>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="space-y-0.5">{children}</div>
    </fieldset>
  );
}

function FilterOption({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      role="checkbox"
      aria-checked={active}
      className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm hover:bg-secondary"
    >
      <span
        className={cn(
          "flex size-4.5 shrink-0 items-center justify-center rounded border",
          active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        )}
      >
        {active && <CheckIcon className="size-3.5" strokeWidth={3} />}
      </span>
      {label}
    </Link>
  );
}

function PriceFilter({ pathname, params, lang }: { pathname: string; params: RawParams; lang: Lang }) {
  const t = getDict(lang);
  const keep = Object.entries(params).filter(([k, v]) => v && !["min", "max", "page"].includes(k));
  return (
    <form action={localizePath(pathname, lang)} className="space-y-2">
      <p className="text-sm font-semibold">{t.listing.price}</p>
      {keep.map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={Array.isArray(v) ? v[0] : v} />
      ))}
      <div className="flex items-center gap-2">
        <input
          name="min"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          placeholder={t.listing.min}
          defaultValue={params.min as string | undefined}
          aria-label={t.listing.min}
          className="h-9 w-full min-w-0 rounded-lg border border-input px-2 text-sm"
        />
        <span className="text-muted-foreground">–</span>
        <input
          name="max"
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          placeholder={t.listing.max}
          defaultValue={params.max as string | undefined}
          aria-label={t.listing.max}
          className="h-9 w-full min-w-0 rounded-lg border border-input px-2 text-sm"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" className="w-full">
        {t.listing.applyPrice}
      </Button>
    </form>
  );
}
