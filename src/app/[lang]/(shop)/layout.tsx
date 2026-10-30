import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { isLang } from "@/i18n/config";

export default async function ShopLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "en";
  return (
    <>
      <Header lang={lang} />
      <main className="flex-1 bg-surface">{children}</main>
      <Footer lang={lang} />
    </>
  );
}
