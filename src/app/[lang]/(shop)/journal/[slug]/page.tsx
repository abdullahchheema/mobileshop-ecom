import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Blocks, ContactCard, JsonLd } from "@/components/content/info-page";
import Link from "@/components/i18n/link";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { article, articles } from "@/content";
import { getDict, langOf } from "@/i18n";
import { LANGS } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => articles(lang).map((a) => ({ lang, slug: a.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/journal/[slug]">): Promise<Metadata> {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const a = article(lang, slug);
  if (!a) return {};
  return { title: a.title, description: a.excerpt, alternates: alternatesFor(`/journal/${slug}`, lang), openGraph: { type: "article", title: a.title, description: a.excerpt } };
}

export default async function ArticlePage({ params }: PageProps<"/[lang]/journal/[slug]">) {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const a = article(lang, slug);
  if (!a) notFound();
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.excerpt,
          inLanguage: lang === "ur" ? "ur-PK" : "en-PK",
          author: { "@type": "Organization", name: site.name },
          publisher: { "@type": "Organization", name: site.name },
        }}
      />
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.pages.journalTitle, href: "/journal" }, { label: a.title }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{a.title}</h1>
        <p className="text-sm text-muted-foreground">{t.pages.minRead(a.minutes)}</p>
      </header>
      <Blocks blocks={a.blocks} />
      <p>
        <Link href="/journal" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          {t.pages.backToJournal}
        </Link>
      </p>
      <ContactCard lang={lang} />
    </div>
  );
}
