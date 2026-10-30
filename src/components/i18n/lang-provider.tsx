"use client";

import { createContext, useContext } from "react";
import { type Lang, localizePath } from "@/i18n/config";
import { getDict } from "@/i18n";

const LangContext = createContext<Lang>("en");

/** Makes the page language available to client components (set once per [lang] layout). */
export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

/** Current language, its dictionary, and a helper that prefixes paths for it. */
export function useI18n() {
  const lang = useContext(LangContext);
  return { lang, t: getDict(lang), href: (path: string) => localizePath(path, lang) };
}
