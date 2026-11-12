import { CircleCheckIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { ProductPageData } from "@/lib/catalog";
import type { Lang } from "@/i18n/config";
import { getDict, optionValueLabel } from "@/i18n";
import { site } from "@/lib/site";

export function ProductDetails({ product, lang }: { product: ProductPageData; lang: Lang }) {
  const t = getDict(lang);
  const conditions = product.pickers.find((p) => p.type === "CONDITION")?.values ?? [];
  const hasPta = product.pickers.some((p) => p.type === "SIM");
  const specs = Object.entries(product.specs);

  return (
    <div className="space-y-14">
      {conditions.length > 0 && (
        <section id="condition-guide" className="scroll-mt-40">
          <SectionTitle title={t.product.guide.title} subtitle={t.product.guide.subtitle} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {conditions.map((c) => {
              const guide = t.conditions[c.value];
              if (!guide) return null;
              return (
                <div key={c.id} className="rounded-2xl border p-5">
                  <h3 className="text-lg font-bold">{optionValueLabel(t, "CONDITION", c)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{guide.summary}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <GuideRow term={t.product.guide.screen} detail={guide.screen} />
                    <GuideRow term={t.product.guide.body} detail={guide.body} />
                    <GuideRow term={t.product.guide.battery} detail={guide.battery} />
                  </dl>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {hasPta && (
        <section id="pta" className="scroll-mt-40 rounded-3xl bg-sky p-6 md:p-8">
          <h2 className="text-xl font-bold">{t.product.ptaTitle}</h2>
          <div className="mt-3 grid gap-4 text-sm md:grid-cols-2">
            <p>{t.product.ptaApproved}</p>
            <p>{t.product.ptaNon}</p>
          </div>
        </section>
      )}

      <section>
        <SectionTitle
          title={t.product.inspectionTitle(site.inspectionPoints)}
          subtitle={t.product.inspectionText}
        />
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.product.checks.map((check) => (
            <li key={check} className="flex items-center gap-2 text-sm">
              <CircleCheckIcon className="size-4.5 shrink-0 text-primary" />
              {check}
            </li>
          ))}
        </ul>
      </section>

      {specs.length > 0 && (
        <section aria-labelledby="specs-title">
          <SectionTitle title={t.product.specs} id="specs-title" />
          {/* Cards flow in a grid: side by side where there is room, stacked on a phone, all the same style. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {specs.map(([group, fields]) => (
              <div key={group} className="flex h-full flex-col rounded-2xl border bg-card p-5 transition-shadow duration-200 hover:shadow-[0_8px_16px_0_rgba(17,15,21,0.08)]">
                <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{group}</h3>
                <dl className="grid flex-1 content-start gap-y-2.5 text-sm">
                  {Object.entries(fields).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-medium break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** The FAQ is the last block of a product page, set apart from everything above it by a divider. */
export function ProductFaq({ product, lang }: { product: ProductPageData; lang: Lang }) {
  const t = getDict(lang);
  return (
      <section aria-labelledby="faq-title" className="border-t pt-12">
      <SectionTitle title={t.product.faqTitle} id="faq-title" />
      <Accordion type="single" collapsible className="mx-auto max-w-3xl rounded-2xl border px-4">
        {t.product.faqs(product.name, site.warrantyMonths, site.returnDays).map((faq) => (
          <AccordionItem key={faq.q} value={faq.q}>
            <AccordionTrigger>{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function SectionTitle({ title, subtitle, id }: { title: string; subtitle?: string; id?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-2xl font-bold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function GuideRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div>
      <dt className="font-semibold">{term}</dt>
      <dd className="text-muted-foreground">{detail}</dd>
    </div>
  );
}
