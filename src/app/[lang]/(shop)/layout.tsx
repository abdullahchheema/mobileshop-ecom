import { Footer } from "@/components/layout/footer";
import { CatalogueNotice } from "@/components/layout/catalogue-notice";
import { Header } from "@/components/layout/header";
import { LiveRefresh } from "@/components/layout/live-refresh";
import { Suspense } from "react";
import { isLang } from "@/i18n/config";

export default async function ShopLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "en";
  return (
    <>
      <Header lang={lang} />
      <LiveRefresh />
      <Suspense>
        <CatalogueNotice lang={lang} />
      </Suspense>
      <main className="flex-1 bg-surface">{children}</main>
      <Footer lang={lang} />
    </>
  );
}
