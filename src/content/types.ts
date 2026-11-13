import type { Lang } from "@/i18n/config";

/** One part of a page: an optional heading followed by paragraphs, a bullet list, numbered steps and/or links. */
export type Block = {
  heading?: string;
  paragraphs?: string[];
  list?: string[];
  steps?: string[];
  links?: { label: string; href: string }[];
};

export type Doc = { title: string; description: string; intro: string; blocks: Block[] };

export type PageKey = "shipping" | "returns" | "warranty" | "cod" | "tradeIn" | "about" | "promise" | "terms" | "privacy";

/** Where each page lives (the footer links here). */
export const PAGE_PATH: Record<PageKey, string> = {
  shipping: "/help/shipping",
  returns: "/help/returns",
  warranty: "/help/warranty",
  cod: "/help/cash-on-delivery",
  tradeIn: "/trade-in",
  about: "/about",
  promise: "/promise",
  terms: "/legal/terms",
  privacy: "/legal/privacy",
};

export type Faq = { question: string; answer: string; link?: { label: string; href: string } };

export type Article = { slug: string; minutes: number; title: string; excerpt: string; blocks: Block[] };

export type ByLang<T> = Record<Lang, T>;
