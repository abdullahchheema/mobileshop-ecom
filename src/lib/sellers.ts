import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { sendSms } from "@/lib/sms";
import type { SellerApplication } from "@/lib/validators";

export class SellerError extends Error {}

export function getSellerForUser(userId: string) {
  return db.seller.findUnique({ where: { userId } });
}

/** Creates a PENDING seller. The user only becomes a SELLER once an admin approves. */
export async function applyAsSeller(userId: string, input: SellerApplication) {
  if (await getSellerForUser(userId)) throw new SellerError("You've already applied to sell on Trendz.");

  const base = slugify(input.shopName) || "shop";
  let slug = base;
  for (let n = 2; await db.seller.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;

  const { shopName, city, phone, cnic, ntn, description, bankName, accountTitle, iban } = input;
  return db.seller.create({
    data: { shopName, city, phone, cnic, ntn, description, bankName, accountTitle, iban, slug, userId, status: "PENDING" },
  });
}

export async function setSellerStatus(sellerId: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") {
  const seller = await db.seller.update({
    where: { id: sellerId },
    data: { status, ...(status === "APPROVED" && { approvedAt: new Date() }) },
    select: { userId: true, phone: true, shopName: true },
  });
  // Only approved sellers get seller access; suspension or rejection removes it.
  await db.user.update({ where: { id: seller.userId }, data: { role: status === "APPROVED" ? "SELLER" : "BUYER" } });

  const message = {
    APPROVED: `Trendz: ${seller.shopName} is approved! Sign in and open your seller dashboard to add your first listing.`,
    REJECTED: `Trendz: we couldn't approve ${seller.shopName} right now. Reply to this message or contact support for details.`,
    SUSPENDED: `Trendz: ${seller.shopName} has been suspended and your listings are hidden. Contact support.`,
  }[status];
  try {
    await sendSms(seller.phone, message);
  } catch (e) {
    console.error("[notify] SMS failed", e);
  }
}

/**
 * The signed-in user's approved seller account, or a redirect: to sign-in,
 * to the application form, or to the application status page.
 */
export async function requireSeller(returnTo: string) {
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  const seller = await getSellerForUser(session.user.id);
  if (!seller) redirect("/sell/apply");
  if (seller.status !== "APPROVED") redirect("/sell/status");
  return { session, seller };
}
