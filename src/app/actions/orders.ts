"use server";

import { refresh, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localized } from "@/i18n/server";
import { cancelOrder, CheckoutError, placeOrder } from "@/lib/orders";
import { startOnlinePayment } from "@/lib/payments/service";
import { requestReturn, ReturnError } from "@/lib/return-requests";
import { RETURN_REASONS } from "@/lib/returns";
import { getSession } from "@/lib/session";
import { placeOrderSchema } from "@/lib/validators";

export type OrderActionError = { ok: false; code: CheckoutError["code"] | "UNAUTHENTICATED" | "INVALID"; error: string };

export async function placeOrderAction(input: z.input<typeof placeOrderSchema>): Promise<OrderActionError> {
  const session = await getSession();
  if (!session) return { ok: false, code: "UNAUTHENTICATED", error: "Please sign in again to place your order." };

  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "INVALID", error: parsed.error.issues[0]?.message ?? "Invalid order." };

  let orderId: string;
  try {
    orderId = (await placeOrder({ userId: session.user.id, ...parsed.data })).id;
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, code: e.code, error: e.message };
    throw e;
  }

  // Stock changed: listings and product pages refresh in the background.
  revalidateTag("offers", "max");
  // The cart is now empty: re-render the header badge too, not just the new page.
  refresh();

  if (parsed.data.paymentMethod !== "COD") {
    let paymentUrl: string | null = null;
    try {
      paymentUrl = await startOnlinePayment(session.user.id, orderId);
    } catch (e) {
      // The order exists and holds its stock; the buyer can retry from the order page.
      console.error("[payments] could not start payment after placing order", e);
    }
    redirect(paymentUrl ?? `${await localized(`/account/orders/${orderId}`)}?payment=error`);
  }
  redirect(`${await localized(`/account/orders/${orderId}`)}?placed=1`);
}

export async function cancelOrderAction(orderId: string) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Please sign in again." };
  try {
    await cancelOrder(session.user.id, z.string().parse(orderId));
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false as const, error: e.message };
    throw e;
  }
  revalidateTag("offers", "max");
  refresh();
  return { ok: true as const };
}

const returnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.enum(RETURN_REASONS, { message: "Choose a reason" }),
  details: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export async function requestReturnAction(input: z.input<typeof returnSchema>) {
  const session = await getSession();
  if (!session) return { ok: false as const, error: "Please sign in again." };
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await requestReturn(session.user.id, parsed.data.orderItemId, parsed.data);
  } catch (e) {
    if (e instanceof ReturnError) return { ok: false as const, error: e.message };
    throw e;
  }
  refresh();
  return { ok: true as const };
}
