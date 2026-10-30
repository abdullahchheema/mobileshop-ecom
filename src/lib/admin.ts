import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

/** For admin pages: the admin's session, or a redirect (sign-in, or home for non-admins). */
export async function requireAdmin(returnTo: string) {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  if (session.user.role !== "ADMIN") redirect("/");
  return session;
}

/** For admin Server Actions: true only for a signed-in admin. */
export async function isAdmin() {
  const session = await getSession();
  return session?.user.role === "ADMIN";
}

export const ADMINS_ONLY = { ok: false as const, error: "Admins only." };
