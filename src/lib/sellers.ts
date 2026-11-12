import "server-only";
import { db } from "@/lib/db";

/**
 * Shows or hides everything a seller record owns on the storefront. Sellers no longer sign in
 * (the admin panel runs orders and returns), so this changes visibility only, never a user's role.
 */
export async function setSellerStatus(sellerId: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") {
  await db.seller.update({
    where: { id: sellerId },
    data: { status, ...(status === "APPROVED" && { approvedAt: new Date() }) },
  });
}
