import type { Metadata } from "next";
import Link from "next/link";
import { fontVariables } from "@/app/fonts";
import { Logo } from "@/components/layout/logo";
import { en } from "@/i18n/dictionaries/en";
import { ur } from "@/i18n/dictionaries/ur";
import "./globals.css";

// 404 for URLs that match no route at all. It renders outside every layout, so
// it can't know the visitor's language: it shows both English and Urdu.

export const metadata: Metadata = { title: "Page not found | Trendz Mobile" };

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="flex min-h-full flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <Logo />
        <div>
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{en.notFound.title}</h1>
          <p className="mt-3 text-muted-foreground">{en.notFound.text}</p>
        </div>
        <div lang="ur" dir="rtl">
          <h2 className="text-2xl font-bold">{ur.notFound.title}</h2>
          <p className="mt-2 text-muted-foreground">{ur.notFound.text}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground">
            {en.notFound.back}
          </Link>
          <Link href="/ur" lang="ur" className="rounded-lg border px-5 py-2.5 font-semibold">
            {ur.notFound.back}
          </Link>
        </div>
      </body>
    </html>
  );
}
