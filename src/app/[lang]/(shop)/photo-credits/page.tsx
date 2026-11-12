import type { Metadata } from "next";
import Link from "@/components/i18n/link";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { PRODUCT_PHOTOS } from "@/lib/product-photos";
import Image from "next/image";

export async function generateMetadata({ params }: PageProps<"/[lang]/photo-credits">): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getDict(lang).photoCredits.title, alternates: alternatesFor("/photo-credits", lang) };
}

export default async function PhotoCreditsPage({ params }: PageProps<"/[lang]/photo-credits">) {
  const t = getDict(await langOf(params)).photoCredits;
  const photos = Object.entries(PRODUCT_PHOTOS);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted-foreground">{t.intro}</p>
      <ul className="divide-y rounded-xl border bg-card">
        {photos.map(([slug, { image, credit }]) => (
          <li key={slug} className="flex items-center gap-4 p-4">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              <Image src={image} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium">
                <Link href={`/p/${slug}`} className="hover:underline">
                  {credit.subject}
                </Link>
              </p>
              <p className="text-muted-foreground">
                {t.by} {credit.author} ·{" "}
                <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {credit.license}
                </a>{" "}
                ·{" "}
                <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  {t.source}
                </a>
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{t.note}</p>
    </div>
  );
}
