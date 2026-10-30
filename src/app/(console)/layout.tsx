import type { Metadata } from "next";
import { fontVariables } from "@/app/fonts";
import { LangProvider } from "@/components/i18n/lang-provider";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import "../globals.css";

// Root layout for the seller hub, admin panel and dev tools (English only).

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  robots: { index: false },
};

export default function ConsoleRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <LangProvider lang="en">
          {children}
          <Toaster position="top-center" />
        </LangProvider>
      </body>
    </html>
  );
}
