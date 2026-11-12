import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, isStorefrontPath, LANG_COOKIE, localizePath, stripLang } from "@/i18n/config";

/** Pages that need a signed-in visitor (checked optimistically here, properly on the page). */
const PROTECTED = /^\/(account|checkout|admin)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Metadata images Next links as /en/opengraph-image are served as they are.
  if (/^\/en\/.*opengraph-image/.test(pathname)) return NextResponse.next();

  // One URL per page: /en/cart → /cart.
  if (/^\/en(\/|$)/.test(pathname)) {
    return NextResponse.redirect(new URL(`${stripLang(pathname)}${search}`, request.url), 308);
  }

  const lang = /^\/ur(\/|$)/.test(pathname) ? "ur" : DEFAULT_LANG;
  const bare = stripLang(pathname);

  if (PROTECTED.test(bare) && !getSessionCookie(request)) {
    const signIn = new URL(localizePath("/sign-in", lang), request.url);
    signIn.searchParams.set("next", pathname + search);
    return NextResponse.redirect(signIn);
  }

  if (!isStorefrontPath(pathname)) return NextResponse.next();

  // English storefront URLs have no prefix; serve them from the [lang] segment.
  const response =
    lang === DEFAULT_LANG
      ? NextResponse.rewrite(new URL(`/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}${search}`, request.url))
      : NextResponse.next();
  // Remember the language for server-side redirects that happen outside a page (payments, actions).
  if (request.cookies.get(LANG_COOKIE)?.value !== lang) {
    response.cookies.set(LANG_COOKIE, lang, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}

export const config = {
  // Everything except build assets, uploads and files with an extension.
  matcher: ["/((?!_next/static|_next/image|uploads|favicon.ico|.*\\..*).*)"],
};
