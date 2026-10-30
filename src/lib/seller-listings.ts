import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getProductPage } from "@/lib/catalog";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { offerFieldsSchema } from "@/lib/validators";

export class ListingError extends Error {}

export const LISTINGS_PAGE_SIZE = 50;

export const LISTING_FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "soldout", label: "Sold out" },
  { key: "paused", label: "Paused" },
] as const;
export type ListingFilter = (typeof LISTING_FILTERS)[number]["key"];

const filterWhere: Record<ListingFilter, Prisma.OfferWhereInput> = {
  all: {},
  live: { status: "ACTIVE", stock: { gt: 0 } },
  soldout: { status: "ACTIVE", stock: 0 },
  paused: { status: "PAUSED" },
};

export async function listSellerOffers(sellerId: string, opts: { q?: string; filter: ListingFilter; page: number }) {
  const tokens = opts.q?.split(/\s+/).filter(Boolean) ?? [];
  const where: Prisma.OfferWhereInput = {
    sellerId,
    ...filterWhere[opts.filter],
    AND: tokens.map((t) => ({ product: { name: { contains: t, mode: "insensitive" } } })),
  };

  const [total, offers] = await Promise.all([
    db.offer.count({ where }),
    db.offer.findMany({
      where,
      orderBy: [{ product: { name: "asc" } }, { price: "asc" }],
      skip: (opts.page - 1) * LISTINGS_PAGE_SIZE,
      take: LISTINGS_PAGE_SIZE,
      select: {
        id: true,
        price: true,
        stock: true,
        status: true,
        warrantyMonths: true,
        variantId: true,
        product: { select: { name: true, slug: true } },
        variant: {
          select: { optionValues: { select: { label: true, value: true, option: { select: { name: true, position: true } } } } },
        },
      },
    }),
  ]);

  // Cheapest buyable offer from other sellers for the same exact device.
  const competitors = await db.offer.groupBy({
    by: ["variantId"],
    where: {
      variantId: { in: offers.map((o) => o.variantId) },
      sellerId: { not: sellerId },
      status: "ACTIVE",
      stock: { gt: 0 },
      seller: { status: "APPROVED" },
    },
    _min: { price: true },
  });
  const lowest = new Map(competitors.map((c) => [c.variantId, c._min.price]));

  return {
    total,
    pageCount: Math.ceil(total / LISTINGS_PAGE_SIZE),
    rows: offers.map((o) => {
      const values = [...o.variant.optionValues].sort((a, b) => a.option.position - b.option.position);
      return {
        id: o.id,
        price: o.price,
        stock: o.stock,
        status: o.status as "ACTIVE" | "PAUSED" | "DRAFT",
        warrantyMonths: o.warrantyMonths,
        productName: o.product.name,
        variantLabel: values.map((v) => v.label).join(" · "),
        href: `/p/${o.product.slug}?${new URLSearchParams(values.map((v) => [slugify(v.option.name), v.value]))}`,
        competitorLowest: lowest.get(o.variantId) ?? null,
      };
    }),
  };
}

export type ListingRow = Awaited<ReturnType<typeof listSellerOffers>>["rows"][number];

export const offerUpdateSchema = offerFieldsSchema.extend({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED"]),
});

/** Saves edited rows. Every update is scoped to the seller, so ids from elsewhere are ignored. */
export async function updateSellerOffers(sellerId: string, updates: z.infer<typeof offerUpdateSchema>[]) {
  await db.$transaction(
    updates.map(({ id, ...data }) => db.offer.updateMany({ where: { id, sellerId }, data })),
  );
}

/** Catalog products a seller can list, for the "add listing" picker. */
export function getListableProducts() {
  return db.product.findMany({
    where: { isActive: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: { id: true, slug: true, name: true, category: { select: { name: true } } },
  });
}

/** Pickers for one product, plus market prices and which variants this seller already lists. */
export async function getNewListingContext(sellerId: string, productSlug: string) {
  const product = await getProductPage(productSlug);
  if (!product) return null;
  const mine = await db.offer.findMany({ where: { sellerId, productId: product.id }, select: { variantId: true } });
  return {
    productId: product.id,
    productName: product.name,
    pickers: product.pickers,
    variants: product.variants.map((v) => ({
      id: v.id,
      valueIds: v.valueIds,
      lowest: v.offers[0]?.price ?? null,
      sellerCount: v.offers.length,
    })),
    listedVariantIds: mine.map((m) => m.variantId),
  };
}

/** Lists a new device: one value per picker. Creates the variant if nobody has listed that combination yet. */
export async function createSellerOffer(
  sellerId: string,
  input: { productId: string; valueIds: string[] } & z.infer<typeof offerFieldsSchema>,
) {
  const product = await db.product.findUnique({
    where: { id: input.productId },
    select: { slug: true, options: { select: { id: true, values: { select: { id: true } } } } },
  });
  if (!product) throw new ListingError("Product not found.");

  const chosen = product.options.map((o) => o.values.find((v) => input.valueIds.includes(v.id))?.id);
  if (chosen.some((id) => !id) || input.valueIds.length !== product.options.length) {
    throw new ListingError("Choose one value for every option.");
  }
  const valueIds = chosen as string[];
  const combinationKey = [...valueIds].sort().join("|");

  const variant =
    (await db.variant.findUnique({
      where: { productId_combinationKey: { productId: input.productId, combinationKey } },
      select: { id: true },
    })) ??
    (await db.variant.create({
      data: {
        productId: input.productId,
        combinationKey,
        sku: `${product.slug}-${crypto.randomUUID().slice(0, 8)}`,
        optionValues: { connect: valueIds.map((id) => ({ id })) },
      },
      select: { id: true },
    }));

  const existing = await db.offer.findUnique({
    where: { sellerId_variantId: { sellerId, variantId: variant.id } },
    select: { id: true },
  });
  if (existing) throw new ListingError("You already list this exact device. Update its price and stock in Listings.");

  return db.offer.create({
    data: {
      sellerId,
      productId: input.productId,
      variantId: variant.id,
      price: input.price,
      stock: input.stock,
      warrantyMonths: input.warrantyMonths,
      status: "ACTIVE",
    },
    select: { id: true },
  });
}
