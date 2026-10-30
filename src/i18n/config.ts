// Storefront languages. English URLs have no prefix (/p/iphone-14); Urdu lives
// under /ur (/ur/p/iphone-14). The proxy maps English URLs to the [lang] segment.

export const LANGS = ["en", "ur"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

/** Last storefront language the visitor used (set by the proxy). */
export const LANG_COOKIE = "trendz_lang";

export const isLang = (value: string): value is Lang => (LANGS as readonly string[]).includes(value);
export const dirOf = (lang: Lang) => (lang === "ur" ? "rtl" : "ltr");

/** Removes a language prefix: "/ur/cart" → "/cart". */
export function stripLang(path: string) {
  const match = /^\/(en|ur)(?=\/|$|\?)/.exec(path);
  return match ? path.slice(match[0].length) || "/" : path;
}

/** Adds the prefix a language needs: ("/cart", "ur") → "/ur/cart". English stays unprefixed. */
export function localizePath(path: string, lang: Lang) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const bare = stripLang(path);
  // The seller hub, admin, API and files have no language versions.
  if (!isStorefrontPath(bare.split("?")[0])) return bare;
  if (lang === DEFAULT_LANG) return bare;
  return bare === "/" ? `/${lang}` : bare.startsWith("/?") ? `/${lang}${bare.slice(1)}` : `/${lang}${bare}`;
}

/** Storefront pages (anything not owned by the API, seller hub, admin, dev tools or assets). */
export function isStorefrontPath(path: string) {
  return !/^\/(api|_next|seller|admin|dev|payment|uploads)(\/|$)/.test(path) && !/\.[a-z0-9]+$/i.test(path);
}
