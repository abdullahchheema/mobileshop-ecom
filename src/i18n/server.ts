import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang, localizePath } from "@/i18n/config";

/** The visitor's storefront language, for redirects from actions and route handlers. */
export async function requestLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return value && isLang(value) ? value : DEFAULT_LANG;
}

/** A path in the visitor's language. */
export async function localized(path: string) {
  return localizePath(path, await requestLang());
}
