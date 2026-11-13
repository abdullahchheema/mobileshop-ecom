import type { Metadata } from "next";
import { ChevronRightIcon } from "lucide-react";
import { ContactCard, JsonLd } from "@/components/content/info-page";
import Link from "@/components/i18n/link";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FAQS, PAGE_PATH, type PageKey } from "@/content";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

const TOPICS: PageKey[] = ["shipping", "returns", "warranty", "cod", "tradeIn"];

export async function generateMetadata({ params }: PageProps<"/[lang]/help">): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return { title: t.pages.helpTitle, description: t.pages.helpDescription, alternates: alternatesFor("/help", lang) };
}

export default async function HelpPage({ params }: PageProps<"/[lang]/help">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  const faqs = FAQS[lang];
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
        }}
      />
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.pages.helpTitle }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t.pages.helpTitle}</h1>
        <p className="text-lg leading-8 text-muted-foreground">{t.pages.helpIntro}</p>
      </header>

      <section aria-labelledby="topics-title" className="space-y-3">
        <h2 id="topics-title" className="text-xl font-semibold tracking-tight">
          {t.pages.topics}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TOPICS.map((key) => (
            <li key={key}>
              <Link href={PAGE_PATH[key]} className="flex h-full items-center justify-between gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary">
                <span>
                  <span className="block font-semibold">{t.footer.links[key]}</span>
                  <span className="block text-sm text-muted-foreground">{t.pages.topicText[key]}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title" className="space-y-3">
        <h2 id="faq-title" className="text-xl font-semibold tracking-tight">
          {t.pages.faqTitle}
        </h2>
        <Accordion type="single" collapsible className="rounded-2xl border px-4">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent className="space-y-2 text-muted-foreground">
                <p>{faq.answer}</p>
                {faq.link && (
                  <Link href={faq.link.href} className="inline-block font-medium text-primary underline-offset-4 hover:underline">
                    {faq.link.label}
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <ContactCard lang={lang} />
    </div>
  );
}
