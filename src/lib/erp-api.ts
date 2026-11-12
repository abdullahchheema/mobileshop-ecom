import "server-only";
import { revalidateTag } from "next/cache";
import { CatalogError } from "@/lib/admin-products";
import { apiError, handleDomainError } from "@/lib/api";
import { MappingError } from "@/lib/crm-mapping";
import type { SyncSource } from "@/lib/crm-sync";
import { db } from "@/lib/db";
import { CheckoutError } from "@/lib/orders";
import { ReturnError } from "@/lib/return-requests";
import { FulfillmentError } from "@/lib/seller-orders";
import { UploadError } from "@/lib/storage";
import { VariantError } from "@/lib/variants";

/**
 * Helpers for the signed `/api/erp/v1/*` routes the ERP's E-commerce section calls.
 * Every route authenticates with `requireCrmSource` / `readSignedCrmJson` (Bearer key + HMAC)
 * and may only touch the shop that owns the key: its orders, its returns, its listings.
 */

/** Maps the errors our own lib functions throw to JSON answers the ERP can show to staff. */
export function erpError(e: unknown) {
  if (e instanceof FulfillmentError || e instanceof ReturnError || e instanceof MappingError || e instanceof VariantError || e instanceof CatalogError) {
    return apiError(409, "REJECTED", e.message);
  }
  if (e instanceof UploadError) return apiError(400, "INVALID_IMAGE", e.message);
  if (e instanceof CheckoutError) return handleDomainError(e);
  throw e;
}

export const notFound = (what: string) => apiError(404, "NOT_FOUND", `${what} was not found.`);

/** The shipment, if it belongs to this order and to the shop behind the key. */
export function findShipment(source: SyncSource, orderId: string, sellerOrderId: string) {
  return db.sellerOrder.findFirst({
    where: { id: sellerOrderId, orderId, sellerId: source.sellerId },
    select: { id: true, sellerId: true },
  });
}

/** True when the order has at least one shipment from the shop behind the key. */
export async function ownsOrder(source: SyncSource, orderId: string) {
  return (await db.sellerOrder.count({ where: { orderId, sellerId: source.sellerId } })) > 0;
}

export async function ownsReturn(source: SyncSource, returnId: string) {
  return (await db.returnRequest.count({ where: { id: returnId, orderItem: { sellerOrder: { sellerId: source.sellerId } } } })) > 0;
}

export async function ownsListing(source: SyncSource, mapId: string) {
  return (await db.crmListingMap.count({ where: { id: mapId, sourceId: source.id } })) > 0;
}

/** Product edits change what buyers see: expire the storefront caches (same tags the website admin used). */
export function expireProduct(slug: string) {
  for (const tag of ["categories", "offers", `product:${slug}`]) revalidateTag(tag, "max");
}
