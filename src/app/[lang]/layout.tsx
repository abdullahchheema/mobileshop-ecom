import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fontVariables } from "@/app/fonts";
import { LangProvider } from "@/components/i18n/lang-provider";
import { Toaster } from "@/components/ui/sonner";
import { dirOf, isLang, LANGS } from "@/i18n/config";
import { getDict } from "@/i18n";
import { site } from "@/lib/site";
import "../globals.css";

// Root layout for the storefront, one per language: sets <html lang dir> so Urdu renders right-to-left.

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLang(lang) ? lang : "en");
  return {
    metadataBase: new URL(site.url),
    title: { default: `${site.name} | ${t.meta.title}`, template: `%s | ${site.name}` },
    description: t.meta.description(site.warrantyMonths),
    openGraph: { siteName: site.name, locale: lang === "ur" ? "ur_PK" : "en_PK", type: "website" },
  };
}

export default async function StorefrontRootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <html lang={lang} dir={dirOf(lang)} className={`${fontVariables} h-full antialiased`}>
      {/* Leave room for the product page's sticky mobile buy bar so it never covers the footer. */}
      <body className="flex min-h-full flex-col has-[[data-sticky-buy-bar]]:pb-[72px] lg:has-[[data-sticky-buy-bar]]:pb-0">
        <LangProvider lang={lang}>
          {children}
          <Toaster position="top-center" dir={dirOf(lang)} />
        </LangProvider>
      </body>
    </html>
  );
}
