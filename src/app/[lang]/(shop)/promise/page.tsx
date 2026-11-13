import type { Metadata } from "next";
import { ConditionGuide, InfoPage } from "@/components/content/info-page";
import { pageDoc } from "@/content";
import { langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/promise">): Promise<Metadata> {
  const lang = await langOf(params);
  const doc = pageDoc(lang, "promise");
  return { title: doc.title, description: doc.description, alternates: alternatesFor("/promise", lang) };
}

export default async function PromisePage({ params }: PageProps<"/[lang]/promise">) {
  const lang = await langOf(params);
  return (
    <InfoPage lang={lang} page="promise" doc={pageDoc(lang, "promise")}>
      <ConditionGuide lang={lang} />
    </InfoPage>
  );
}
