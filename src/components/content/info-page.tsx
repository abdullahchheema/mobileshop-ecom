import { Suspense } from "react";
import { MailIcon, PhoneIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Breadcrumbs, type Crumb } from "@/components/listing/breadcrumbs";
import type { Block, Doc, PageKey } from "@/content/types";
import { PAGE_PATH } from "@/content/types";
import type { Lang } from "@/i18n/config";
import { formatDateFor, getDict, ltr } from "@/i18n";
import { getStoreConfig } from "@/lib/erp-config";
import { policy } from "@/lib/policy";
import { formatPkr, site } from "@/lib/site";

/** Structured data for search engines. JSON.stringify output is safe in a script tag once "<" is escaped. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const RELATED: Record<PageKey, PageKey[]> = {
  shipping: ["cod", "returns", "warranty"],
  returns: ["warranty", "shipping", "cod"],
  warranty: ["returns", "shipping"],
  cod: ["shipping", "returns"],
  tradeIn: ["promise", "warranty"],
  about: ["promise", "shipping", "returns"],
  promise: ["warranty", "returns", "about"],
  terms: ["privacy", "returns", "shipping"],
  privacy: ["terms"],
};

/** The text of a page: headings, paragraphs, bullets, numbered steps and links. */
export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-8">
      {blocks.map((block, i) => (
        <section key={block.heading ?? i} className="space-y-3">
          {block.heading && <h2 className="text-xl font-semibold tracking-tight">{block.heading}</h2>}
          {block.paragraphs?.map((p) => (
            <p key={p} className="leading-7 text-muted-foreground">
              {p}
            </p>
          ))}
          {block.list && (
            <ul className="list-disc space-y-2 ps-6 leading-7 text-muted-foreground marker:text-primary">
              {block.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {block.steps && (
            <ol className="list-decimal space-y-2 ps-6 leading-7 text-muted-foreground marker:font-semibold marker:text-primary">
              {block.steps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          )}
          {block.links && (
            <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
              {block.links.map((l) => (
                <Link key={l.href} href={l.href} className="text-primary underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              ))}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}

export function ContactCard({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <aside className="rounded-2xl border bg-card p-6" aria-labelledby="contact-title">
      <h2 id="contact-title" className="text-lg font-semibold">
        {t.pages.needHelp}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.pages.needHelpText}</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
        <a href={`tel:${site.supportPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 hover:bg-secondary">
          <PhoneIcon className="size-4" aria-hidden /> {t.pages.call}: <bdi dir="ltr">{ltr(site.supportPhone)}</bdi>
        </a>
        <a href={`mailto:${site.supportEmail}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2 hover:bg-secondary">
          <MailIcon className="size-4" aria-hidden /> {t.pages.email}: <bdi dir="ltr">{site.supportEmail}</bdi>
        </a>
      </div>
    </aside>
  );
}

/**
 * A standard information page: breadcrumbs, title, introduction, the text, then (optionally) extra content, related pages and the contact card.
 * `page` selects the related links; `legal` adds the review date.
 */
export function InfoPage({ lang, page, doc, trail, legal, children }: { lang: Lang; page: PageKey; doc: Doc; trail?: Crumb[]; legal?: boolean; children?: React.ReactNode }) {
  const t = getDict(lang);
  const related = RELATED[page];
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, ...(trail ?? []), { label: doc.title }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-lg leading-8 text-muted-foreground">{doc.intro}</p>
        {legal && <p className="text-sm text-muted-foreground">{t.pages.updated(formatDateFor(new Date(policy.reviewed), lang))}</p>}
      </header>
      <Blocks blocks={doc.blocks} />
      {children}
      <nav aria-label={t.pages.related} className="border-t pt-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t.pages.related}</h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          {related.map((key) => (
            <li key={key}>
              <Link href={PAGE_PATH[key]} className="text-primary underline-offset-4 hover:underline">
                {t.footer.links[key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <ContactCard lang={lang} />
    </div>
  );
}

/** Today's delivery charges, read from the ERP's settings (the same numbers checkout uses). Shown under the shipping text. */
async function Rates({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const { delivery } = await getStoreConfig();
  const lines = [
    t.pages.deliveryDefault(formatPkr(delivery.fee)),
    ...delivery.provinces.map((p) => t.pages.deliveryProvince(p.province, formatPkr(p.fee))),
    delivery.freeFrom !== null ? t.pages.deliveryFree(formatPkr(delivery.freeFrom)) : t.pages.deliveryNever,
  ];
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="text-xl font-semibold tracking-tight">{t.pages.deliveryRatesTitle}</h2>
      <ul className="list-disc space-y-1 ps-6 text-muted-foreground marker:text-primary">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

export function DeliveryRates({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={null}>
      <Rates lang={lang} />
    </Suspense>
  );
}

async function CodNotice({ lang }: { lang: Lang }) {
  const config = await getStoreConfig();
  if (config.paymentMethods.some((m) => m.method === "Cash on Delivery")) return null;
  return (
    <p role="status" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
      {getDict(lang).pages.codOff}
    </p>
  );
}

/** Says so when the shop has switched cash on delivery off, so this page never promises what checkout does not offer. */
export function CodStatus({ lang }: { lang: Lang }) {
  return (
    <Suspense fallback={null}>
      <CodNotice lang={lang} />
    </Suspense>
  );
}

/** The four condition grades with what each means for the screen, the body and the battery. */
export function ConditionGuide({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {["fair", "good", "excellent", "premium"].map((key) => {
        const c = t.conditions[key];
        return (
          <section key={key} className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">{c.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex gap-2">
                <dt className="font-medium">{t.pages.screen}:</dt>
                <dd className="text-muted-foreground">{c.screen}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">{t.pages.body}:</dt>
                <dd className="text-muted-foreground">{c.body}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">{t.pages.battery}:</dt>
                <dd className="text-muted-foreground">{c.battery}</dd>
              </div>
            </dl>
          </section>
        );
      })}
    </div>
  );
}
