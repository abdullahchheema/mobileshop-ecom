import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoPage } from "@/components/content/info-page";
import { LEGAL_DOCS, pageDoc } from "@/content";
import { langOf } from "@/i18n";
import { LANGS } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";

const docOf = (doc: string) => (Object.hasOwn(LEGAL_DOCS, doc) ? LEGAL_DOCS[doc as keyof typeof LEGAL_DOCS] : null);

export function generateStaticParams() {
  return LANGS.flatMap((lang) => Object.keys(LEGAL_DOCS).map((doc) => ({ lang, doc })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/legal/[doc]">): Promise<Metadata> {
  const [lang, { doc }] = await Promise.all([langOf(params), params]);
  const page = docOf(doc);
  if (!page) return {};
  const d = pageDoc(lang, page);
  return { title: d.title, description: d.description, alternates: alternatesFor(`/legal/${doc}`, lang) };
}

export default async function LegalPage({ params }: PageProps<"/[lang]/legal/[doc]">) {
  const [lang, { doc }] = await Promise.all([langOf(params), params]);
  const page = docOf(doc);
  if (!page) notFound();
  return <InfoPage lang={lang} page={page} doc={pageDoc(lang, page)} legal />;
}
