import type { Lang } from "@/i18n/config";
import { ARTICLES } from "./journal";
import { pagesEn } from "./pages-en";
import { pagesUr } from "./pages-ur";
import type { Doc, PageKey } from "./types";

export { FAQS } from "./faq";
export { PAGE_PATH } from "./types";
export type { Article, Block, Doc, Faq, PageKey } from "./types";

const PAGES: Record<Lang, Record<PageKey, Doc>> = { en: pagesEn, ur: pagesUr };

export const pageDoc = (lang: Lang, page: PageKey): Doc => PAGES[lang][page];
export const articles = (lang: Lang) => ARTICLES[lang];
export const article = (lang: Lang, slug: string) => ARTICLES[lang].find((a) => a.slug === slug);

/** The help sub-pages by their URL segment. */
export const HELP_TOPICS = { shipping: "shipping", returns: "returns", warranty: "warranty", "cash-on-delivery": "cod" } as const satisfies Record<string, PageKey>;
export const LEGAL_DOCS = { terms: "terms", privacy: "privacy" } as const satisfies Record<string, PageKey>;
