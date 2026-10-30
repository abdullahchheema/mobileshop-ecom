import "server-only";
import { cookies } from "next/headers";
import { CART_COOKIE, type CartOwner, newGuestToken } from "@/lib/cart";
import { getSession } from "@/lib/session";

/** The web visitor's cart owner, or null if they have no cart yet. Request-time: use inside <Suspense>. */
export async function currentCartOwner(): Promise<CartOwner | null> {
  const session = await getSession();
  if (session) return { userId: session.user.id };
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? { guestToken: token } : null;
}

/** Like currentCartOwner, but starts a guest cart (sets the cookie). Server Actions only. */
export async function ensureCartOwner(): Promise<CartOwner> {
  const owner = await currentCartOwner();
  if (owner) return owner;

  const guestToken = newGuestToken();
  (await cookies()).set(CART_COOKIE, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { guestToken };
}
