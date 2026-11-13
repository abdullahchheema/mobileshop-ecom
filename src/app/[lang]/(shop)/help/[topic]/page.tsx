import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodStatus, DeliveryRates, InfoPage } from "@/components/content/info-page";
import { HELP_TOPICS, pageDoc } from "@/content";
import { getDict, langOf } from "@/i18n";
import { LANGS } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";

const topicOf = (topic: string) => (Object.hasOwn(HELP_TOPICS, topic) ? HELP_TOPICS[topic as keyof typeof HELP_TOPICS] : null);

export function generateStaticParams() {
  return LANGS.flatMap((lang) => Object.keys(HELP_TOPICS).map((topic) => ({ lang, topic })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/help/[topic]">): Promise<Metadata> {
  const [lang, { topic }] = await Promise.all([langOf(params), params]);
  const page = topicOf(topic);
  if (!page) return {};
  const doc = pageDoc(lang, page);
  return { title: doc.title, description: doc.description, alternates: alternatesFor(`/help/${topic}`, lang) };
}

export default async function HelpTopicPage({ params }: PageProps<"/[lang]/help/[topic]">) {
  const [lang, { topic }] = await Promise.all([langOf(params), params]);
  const page = topicOf(topic);
  if (!page) notFound();
  const t = getDict(lang);
  return (
    <InfoPage lang={lang} page={page} doc={pageDoc(lang, page)} trail={[{ label: t.pages.helpTitle, href: "/help" }]}>
      {page === "shipping" && <DeliveryRates lang={lang} />}
      {page === "cod" && <CodStatus lang={lang} />}
    </InfoPage>
  );
}
