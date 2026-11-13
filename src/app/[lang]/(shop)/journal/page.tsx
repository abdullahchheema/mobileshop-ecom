import type { Metadata } from "next";
import { ChevronRightIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { articles } from "@/content";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/journal">): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return { title: t.pages.journalTitle, description: t.pages.journalDescription, alternates: alternatesFor("/journal", lang) };
}

export default async function JournalPage({ params }: PageProps<"/[lang]/journal">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <Breadcrumbs items={[{ label: t.common.home, href: "/" }, { label: t.pages.journalTitle }]} />
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t.pages.journalTitle}</h1>
        <p className="text-lg leading-8 text-muted-foreground">{t.pages.journalIntro}</p>
      </header>
      <ul className="space-y-4">
        {articles(lang).map((a) => (
          <li key={a.slug}>
            <Link href={`/journal/${a.slug}`} className="block rounded-2xl border bg-card p-5 transition-colors hover:bg-secondary">
              <h2 className="text-lg font-semibold">{a.title}</h2>
              <p className="mt-1 text-muted-foreground">{a.excerpt}</p>
              <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
                {t.pages.readArticle} <ChevronRightIcon className="size-4 rtl:-scale-x-100" aria-hidden />
                <span className="ms-auto font-normal text-muted-foreground">{t.pages.minRead(a.minutes)}</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
