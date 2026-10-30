import type { Metadata } from "next";
import { type Lang, LANGS, localizePath } from "@/i18n/config";

/**
 * Canonical URL and hreflang alternates for a storefront path. Filtered or
 * configured variants (?sort=…, ?color=…) point at the clean page.
 */
export function alternatesFor(path: string, lang: Lang): Metadata["alternates"] {
  return {
    canonical: localizePath(path, lang),
    languages: {
      ...Object.fromEntries(LANGS.map((l) => [l === "ur" ? "ur-PK" : "en-PK", localizePath(path, l)])),
      "x-default": localizePath(path, "en"),
    },
  };
}
