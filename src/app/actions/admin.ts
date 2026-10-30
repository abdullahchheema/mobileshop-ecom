"use server";

import { refresh, revalidateTag } from "next/cache";
import { z } from "zod";
import { ADMINS_ONLY, isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { CheckoutError, cancelOrder } from "@/lib/orders";
import { createPayout, markPayoutPaid, PayoutError } from "@/lib/payouts";
import { applyReturnAction, ReturnError } from "@/lib/return-requests";
import { setSellerStatus } from "@/lib/sellers";
import { formatPkr } from "@/lib/site";

const input = z.object({ sellerId: z.string().min(1), status: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]) });

export async function setSellerStatusAction(sellerId: string, status: "APPROVED" | "REJECTED" | "SUSPENDED") {
  if (!(await isAdmin())) return ADMINS_ONLY;

  const parsed = input.parse({ sellerId, status });
  await setSellerStatus(parsed.sellerId, parsed.status);
  // Approving or suspending a seller shows or hides all of their offers.
  revalidateTag("offers", "max");
  refresh();
  return { ok: true as const };
}

export async function adminCancelOrderAction(orderId: string) {
  if (!(await isAdmin())) return ADMINS_ONLY;
  try {
    await cancelOrder(null, z.string().parse(orderId));
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false as const, error: e.message };
    throw e;
  }
  revalidateTag("offers", "max");
  refresh();
  return { ok: true as const };
}

const returnActionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["approve", "reject", "receive", "refund"]),
  note: z.string().trim().max(300).optional(),
  refundRef: z.string().trim().max(60).optional(),
});

export async function returnAction(input: z.input<typeof returnActionSchema>) {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = returnActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await applyReturnAction(parsed.data.id, parsed.data.action, parsed.data);
  } catch (e) {
    if (e instanceof ReturnError) return { ok: false as const, error: e.message };
    throw e;
  }
  refresh();
  return { ok: true as const };
}

const commissionSchema = z.object({ sellerId: z.string().min(1), percent: z.coerce.number().min(0).max(50) });

export async function setCommissionAction(data: FormData) {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = commissionSchema.safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false as const, error: "Commission must be between 0% and 50%." };
  // Applies to new orders only: existing orders keep the commission they were placed with.
  await db.seller.update({ where: { id: parsed.data.sellerId }, data: { commissionBps: Math.round(parsed.data.percent * 100) } });
  refresh();
  return { ok: true as const, message: "Commission updated for new orders" };
}

export async function createPayoutAction(data: FormData) {
  if (!(await isAdmin())) return ADMINS_ONLY;
  try {
    const payout = await createPayout(z.string().min(1).parse(data.get("sellerId")));
    refresh();
    return { ok: true as const, message: `Payout of ${formatPkr(payout.amount)} created. Send the bank transfer, then mark it paid.` };
  } catch (e) {
    if (e instanceof PayoutError) return { ok: false as const, error: e.message };
    throw e;
  }
}

export async function markPayoutPaidAction(data: FormData) {
  if (!(await isAdmin())) return ADMINS_ONLY;
  const parsed = z
    .object({ payoutId: z.string().min(1), reference: z.string().trim().min(4, "Enter the bank transfer reference").max(60) })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  await markPayoutPaid(parsed.data.payoutId, parsed.data.reference);
  refresh();
  return { ok: true as const, message: "Payout marked as paid. The seller has been notified." };
}
