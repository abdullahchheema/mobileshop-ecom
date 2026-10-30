import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/** Current session or null. Reads request headers, so call it inside <Suspense>. */
export async function getSession() {
  // Session checks compare expiry against the clock, so they must never be prerendered.
  await connection();
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Current session, or a redirect to sign-in that returns to `returnTo`. Pass the
 * page's localized path ("/ur/account") to keep Urdu visitors on Urdu pages.
 */
export async function requireSession(returnTo: string) {
  const session = await getSession();
  if (!session) {
    const signIn = returnTo.startsWith("/ur/") || returnTo === "/ur" ? "/ur/sign-in" : "/sign-in";
    redirect(`${signIn}?next=${encodeURIComponent(returnTo)}`);
  }
  return session;
}
