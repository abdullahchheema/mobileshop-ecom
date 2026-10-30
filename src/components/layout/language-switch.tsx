"use client";

import NextLink from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type Lang, localizePath } from "@/i18n/config";
import { cn } from "@/lib/utils";

const LABELS: Record<Lang, string> = { en: "English", ur: "اردو" };

/**
 * English | اردو links to the same page in each language. Reads the URL, so
 * render inside <Suspense> with <LanguageLinks path="/"> as the fallback.
 */
export function LanguageSwitch({ current, className }: { current: Lang; className?: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  return <LanguageLinks current={current} path={`${pathname}${query ? `?${query}` : ""}`} className={className} />;
}

export function LanguageLinks({ current, path, className }: { current: Lang; path: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      {(Object.keys(LABELS) as Lang[]).map((lang, i) => (
        <span key={lang} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>|</span>}
          {lang === current ? (
            <span className="font-semibold" lang={lang} aria-current="true">
              {LABELS[lang]}
            </span>
          ) : (
            // Plain next/link: this deliberately leaves the current language.
            <NextLink href={localizePath(path, lang)} lang={lang} hrefLang={lang} className="hover:underline">
              {LABELS[lang]}
            </NextLink>
          )}
        </span>
      ))}
    </span>
  );
}
