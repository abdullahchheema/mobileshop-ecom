import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderTotals } from "@/lib/shipping";
import { slugify } from "@/lib/slug";

// Cart storage and rules. Knows nothing about requests: callers pass the owner
// (see cart-owner.ts for the web, and the /api/v1 routes for the mobile app).

export const CART_COOKIE = "trendz_cart";
export const MAX_QUANTITY = 5;

export type CartOwner = { userId: string } | { guestToken: string };

export const newGuestToken = () => randomBytes(24).toString("base64url");

const ownerWhere = (owner: CartOwner): Prisma.CartWhereUniqueInput =>
  "userId" in owner ? { userId: owner.userId } : { guestToken: owner.guestToken };

export class CartError extends Error {
  constructor(
    public code: "UNAVAILABLE" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

const lineSelect = {
  id: true,
  quantity: true,
  offer: {
    select: {
      id: true,
      price: true,
      stock: true,
      status: true,
      warrantyMonths: true,
      seller: { select: { id: true, shopName: true, city: true, status: true, commissionBps: true } },
      variant: {
        select: {
          optionValues: {
            select: { label: true, value: true, colorHex: true, option: { select: { name: true, position: true, type: true } } },
          },
          product: {
            select: { name: true, slug: true, category: { select: { icon: true, parent: { select: { icon: true } } } } },
          },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

type LineRow = Prisma.CartItemGetPayload<{ select: typeof lineSelect }>;

export type CartLine = ReturnType<typeof toLine>;

function toLine(row: LineRow) {
  const { offer } = row;
  const values = [...offer.variant.optionValues].sort((a, b) => a.option.position - b.option.position);
  const product = offer.variant.product;
  const buyable = offer.status === "ACTIVE" && offer.seller.status === "APPROVED" && offer.stock > 0;
  const query = new URLSearchParams(values.map((v) => [slugify(v.option.name), v.value]));

  return {
    id: row.id,
    quantity: row.quantity,
    offerId: offer.id,
    price: offer.price,
    stock: offer.stock,
    warrantyMonths: offer.warrantyMonths,
    productName: product.name,
    variantLabel: values.map((v) => v.label).join(" · "),
    href: `/p/${product.slug}?${query}`,
    kind: product.category.parent?.icon ?? product.category.icon ?? "smartphone",
    colorHex: values.find((v) => v.option.type === "COLOR")?.colorHex ?? undefined,
    seller: { id: offer.seller.id, name: offer.seller.shopName, city: offer.seller.city, commissionBps: offer.seller.commissionBps },
    /** False when the offer was withdrawn or there isn't enough stock for this quantity. */
    available: buyable && row.quantity <= offer.stock,
    maxQuantity: Math.max(1, Math.min(offer.stock, MAX_QUANTITY)),
  };
}

/** The owner's cart, grouped into one shipment per seller, with totals. */
export async function getCart(owner: CartOwner | null) {
  const cart = owner
    ? await db.cart.findUnique({
        where: ownerWhere(owner),
        select: { id: true, items: { select: lineSelect, orderBy: { id: "asc" } } },
      })
    : null;

  const lines = (cart?.items ?? []).map(toLine);
  const sellers = [...new Map(lines.map((l) => [l.seller.id, l.seller])).values()];
  const shipments = sellers.map((seller) => ({ seller, lines: lines.filter((l) => l.seller.id === seller.id) }));
  // Only lines that can actually be bought count towards the totals.
  const totals = orderTotals(
    shipments.map((s) => ({ sellerId: s.seller.id, lines: s.lines.filter((l) => l.available) })).filter((s) => s.lines.length),
  );

  return {
    id: cart?.id ?? null,
    lines,
    shipments: shipments.map((s) => ({
      ...s,
      shipping: totals.perSeller.find((p) => p.sellerId === s.seller.id)?.shipping ?? 0,
    })),
    totals,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    hasUnavailable: lines.some((l) => !l.available),
  };
}

export type CartView = Awaited<ReturnType<typeof getCart>>;

export async function getCartCount(owner: CartOwner | null) {
  if (!owner) return 0;
  const result = await db.cartItem.aggregate({ where: { cart: ownerWhere(owner) }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

/** Adds an offer (or more of it), capped by stock and MAX_QUANTITY. */
export async function addToCart(owner: CartOwner, offerId: string, quantity = 1) {
  const offer = await db.offer.findFirst({
    where: { id: offerId, status: "ACTIVE", stock: { gt: 0 }, seller: { status: "APPROVED" } },
    select: { stock: true },
  });
  if (!offer) throw new CartError("UNAVAILABLE", "This offer is no longer available.");

  const cart = await db.cart.upsert({ where: ownerWhere(owner), create: owner, update: {}, select: { id: true } });
  const existing = await db.cartItem.findUnique({
    where: { cartId_offerId: { cartId: cart.id, offerId } },
    select: { quantity: true },
  });
  const next = Math.min((existing?.quantity ?? 0) + quantity, offer.stock, MAX_QUANTITY);

  await db.cartItem.upsert({
    where: { cartId_offerId: { cartId: cart.id, offerId } },
    create: { cartId: cart.id, offerId, quantity: next },
    update: { quantity: next },
  });
  return { quantity: next, capped: next < (existing?.quantity ?? 0) + quantity };
}

export async function setQuantity(owner: CartOwner, itemId: string, quantity: number) {
  const item = await db.cartItem.findFirst({
    where: { id: itemId, cart: ownerWhere(owner) },
    select: { offer: { select: { stock: true } } },
  });
  if (!item) throw new CartError("NOT_FOUND", "That item is no longer in your cart.");

  if (quantity <= 0) return db.cartItem.delete({ where: { id: itemId } });
  const capped = Math.min(Math.max(1, Math.floor(quantity)), MAX_QUANTITY, Math.max(item.offer.stock, 1));
  return db.cartItem.update({ where: { id: itemId }, data: { quantity: capped } });
}

export async function removeFromCart(owner: CartOwner, itemId: string) {
  await db.cartItem.deleteMany({ where: { id: itemId, cart: ownerWhere(owner) } });
}

/** Moves a signed-out shopper's cart into their account when they sign in. */
export async function mergeGuestCart(guestToken: string, userId: string) {
  const guest = await db.cart.findUnique({
    where: { guestToken },
    select: { id: true, items: { select: { offerId: true, quantity: true } } },
  });
  if (!guest) return;

  for (const item of guest.items) {
    try {
      await addToCart({ userId }, item.offerId, item.quantity);
    } catch {
      // Offers that disappeared while the shopper was signed out are dropped.
    }
  }
  await db.cart.delete({ where: { id: guest.id } });
}
