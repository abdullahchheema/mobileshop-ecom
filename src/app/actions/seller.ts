"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COURIERS } from "@/lib/fulfillment";
import { applyFulfillment, FulfillmentError } from "@/lib/seller-orders";
import {
  createSellerOffer,
  getNewListingContext,
  ListingError,
  offerUpdateSchema,
  updateSellerOffers,
} from "@/lib/seller-listings";
import { getSellerForUser } from "@/lib/sellers";
import { getSession } from "@/lib/session";
import { offerFieldsSchema } from "@/lib/validators";

type Result = { ok: true } | { ok: false; error: string };

/** The approved seller behind this request, or null. Every action below checks it. */
async function currentSeller() {
  const session = await getSession();
  if (!session) return null;
  const seller = await getSellerForUser(session.user.id);
  return seller?.status === "APPROVED" ? seller : null;
}

const NOT_SELLER: Result = { ok: false, error: "Your seller account isn't active. Sign in again or contact support." };

// Seller edits change what buyers see, so expire the storefront caches right away.
const expireStorefront = () => updateTag("offers");

export async function saveListingsAction(updates: z.input<typeof offerUpdateSchema>[]): Promise<Result> {
  const seller = await currentSeller();
  if (!seller) return NOT_SELLER;
  const parsed = z.array(offerUpdateSchema).max(200).safeParse(updates);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check your changes." };

  await updateSellerOffers(seller.id, parsed.data);
  expireStorefront();
  refresh();
  return { ok: true };
}

export async function getListingContextAction(productSlug: string) {
  const seller = await currentSeller();
  if (!seller) return null;
  return getNewListingContext(seller.id, z.string().parse(productSlug));
}

const newListingSchema = offerFieldsSchema.extend({
  productId: z.string().min(1),
  valueIds: z.array(z.string().min(1)).min(1).max(10),
});

export async function createListingAction(input: z.input<typeof newListingSchema>): Promise<Result> {
  const seller = await currentSeller();
  if (!seller) return NOT_SELLER;
  const parsed = newListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the listing details." };

  try {
    await createSellerOffer(seller.id, parsed.data);
  } catch (e) {
    if (e instanceof ListingError) return { ok: false, error: e.message };
    throw e;
  }
  expireStorefront();
  redirect("/seller/listings?created=1");
}

const fulfillmentSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["confirm", "deliver", "cancel"]) }),
  z.object({
    action: z.literal("ship"),
    courier: z.enum(COURIERS),
    trackingNumber: z.string().trim().min(4, "Enter the tracking number").max(40),
  }),
]);

export async function fulfillmentAction(sellerOrderId: string, input: z.input<typeof fulfillmentSchema>): Promise<Result> {
  const seller = await currentSeller();
  if (!seller) return NOT_SELLER;
  const parsed = fulfillmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };

  try {
    await applyFulfillment(
      seller.id,
      z.string().parse(sellerOrderId),
      parsed.data.action,
      parsed.data.action === "ship" ? parsed.data : undefined,
    );
  } catch (e) {
    if (e instanceof FulfillmentError) return { ok: false, error: e.message };
    throw e;
  }
  // A seller cancellation puts stock back on sale.
  if (parsed.data.action === "cancel") expireStorefront();
  refresh();
  return { ok: true };
}
