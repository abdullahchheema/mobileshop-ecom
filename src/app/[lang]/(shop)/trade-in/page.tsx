import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";
import { pageDoc } from "@/content";
import { langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/trade-in">): Promise<Metadata> {
  const lang = await langOf(params);
  const doc = pageDoc(lang, "tradeIn");
  return { title: doc.title, description: doc.description, alternates: alternatesFor("/trade-in", lang) };
}

export default async function TradeInPage({ params }: PageProps<"/[lang]/trade-in">) {
  const lang = await langOf(params);
  return <InfoPage lang={lang} page="tradeIn" doc={pageDoc(lang, "tradeIn")} />;
}
