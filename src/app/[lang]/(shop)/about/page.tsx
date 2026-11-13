import type { Metadata } from "next";
import { InfoPage } from "@/components/content/info-page";
import { pageDoc } from "@/content";
import { langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const lang = await langOf(params);
  const doc = pageDoc(lang, "about");
  return { title: doc.title, description: doc.description, alternates: alternatesFor("/about", lang) };
}

export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const lang = await langOf(params);
  return <InfoPage lang={lang} page="about" doc={pageDoc(lang, "about")} />;
}
