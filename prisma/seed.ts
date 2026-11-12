// Seeds a demo catalog, sellers, offers and test accounts for local development.
// Run with `npm run db:seed` (or `npm run db:reset` to wipe and re-seed).
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, type UserRole } from "../src/generated/prisma/client";
import { pgAdapterConfig } from "../src/lib/pg-config";
import { PRODUCT_PHOTOS } from "../src/lib/product-photos";
import { slugify } from "../src/lib/slug";
import { BANNERS, BRANDS, CATEGORIES, CONDITIONS, PRODUCTS, PTA_STATUSES, SELLERS } from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg(pgAdapterConfig().config, pgAdapterConfig().options) });

/** Dev-only password for every seeded account. Never use outside local development. */
const DEV_PASSWORD = "trendz-dev-pass";

// Deterministic pseudo-random numbers so every seed produces the same catalog.
let rngState = 20261029;
function random() {
  rngState = (rngState * 1664525 + 1013904223) % 2 ** 32;
  return rngState / 2 ** 32;
}

const roundTo500 = (n: number) => Math.round(n / 500) * 500;

async function createUser(email: string, name: string, role: UserRole, passwordHash: string) {
  const id = randomUUID();
  return db.user.create({
    data: {
      id,
      email,
      name,
      role,
      emailVerified: true,
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash } },
    },
  });
}

async function reset() {
  // Children first so foreign keys don't block deletes.
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.returnRequest.deleteMany();
  await db.orderItem.deleteMany();
  await db.sellerOrder.deleteMany();
  await db.payment.deleteMany();
  await db.order.deleteMany();
  await db.payout.deleteMany();
  await db.offer.deleteMany();
  await db.variant.deleteMany();
  await db.product.deleteMany();
  await db.category.updateMany({ data: { parentId: null } });
  await db.category.deleteMany();
  await db.brand.deleteMany();
  await db.banner.deleteMany();
  await db.seller.deleteMany();
  await db.user.deleteMany({ where: { email: { endsWith: "@trendz.test" } } });
}

async function seedUsersAndSellers() {
  const hash = await hashPassword(DEV_PASSWORD);
  await createUser("admin@trendz.test", "Trendz Admin", "ADMIN", hash);
  await createUser("buyer@trendz.test", "Ayesha Khan", "BUYER", hash);

  const sellers = [];
  for (const [i, s] of SELLERS.entries()) {
    // Only approved sellers have the SELLER role; pending applicants are still buyers.
    const role = s.status === "APPROVED" ? "SELLER" : "BUYER";
    const user = await createUser(`${s.slug}@trendz.test`, `${s.shopName} owner`, role, hash);
    sellers.push(
      await db.seller.create({
        data: {
          userId: user.id,
          shopName: s.shopName,
          slug: s.slug,
          city: s.city,
          phone: `+92300000000${i}`,
          cnic: `35202-000000${i}-1`,
          bankName: "Meezan Bank",
          accountTitle: s.shopName,
          // Dummy IBAN in the valid Pakistani format, for local testing only.
          iban: `PK36MEZN00000000000000${String(i).padStart(2, "0")}`,
          status: s.status,
          approvedAt: s.status === "APPROVED" ? new Date() : null,
          description: `Certified refurbisher based in ${s.city}.`,
        },
      }),
    );
  }
  return sellers.filter((s) => s.status === "APPROVED");
}

async function seedCatalog() {
  const brandIds = new Map<string, string>();
  for (const name of BRANDS) {
    const brand = await db.brand.create({ data: { name, slug: slugify(name) } });
    brandIds.set(name, brand.id);
  }

  const categoryIds = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const parent = await db.category.create({
      data: { name: c.name, slug: c.slug, icon: c.icon, isFeatured: c.featured ?? false, sortOrder: i },
    });
    categoryIds.set(c.slug, parent.id);
    for (const [j, child] of (c.children ?? []).entries()) {
      const created = await db.category.create({
        data: { name: child.name, slug: child.slug, parentId: parent.id, sortOrder: j },
      });
      categoryIds.set(child.slug, created.id);
    }
  }
  return { brandIds, categoryIds };
}

type PriceFactor = { id: string; multiplier: number };

async function seedProduct(
  p: (typeof PRODUCTS)[number],
  brandIds: Map<string, string>,
  categoryIds: Map<string, string>,
  sellerIds: string[],
) {
  const pickers = [
    { type: "CONDITION" as const, name: "Condition", values: CONDITIONS },
    {
      type: p.size.type,
      name: p.size.name,
      values: p.size.values.map((label, i) => ({ label, value: slugify(label), multiplier: 1 + 0.12 * i })),
    },
    ...(p.pta ? [{ type: "SIM" as const, name: "PTA status", values: PTA_STATUSES }] : []),
    {
      type: "COLOR" as const,
      name: "Color",
      values: p.colors.map((c) => ({ label: c.label, value: slugify(c.label), colorHex: c.hex, multiplier: 1 })),
    },
  ];

  const product = await db.product.create({
    data: {
      name: p.name,
      slug: p.slug,
      brandId: brandIds.get(p.brand)!,
      categoryId: categoryIds.get(p.category)!,
      releaseYear: p.releaseYear,
      newPrice: p.newPrice,
      specs: p.specs,
      images: PRODUCT_PHOTOS[p.slug] ? [PRODUCT_PHOTOS[p.slug].image] : [],
      description: `Refurbished ${p.name}, inspected and graded by verified Trendz sellers.`,
      options: {
        create: pickers.map((picker, position) => ({
          type: picker.type,
          name: picker.name,
          position,
          values: {
            create: picker.values.map((v, i) => ({
              label: v.label,
              value: v.value,
              colorHex: "colorHex" in v ? v.colorHex : null,
              position: i,
            })),
          },
        })),
      },
    },
    include: { options: { include: { values: true }, orderBy: { position: "asc" } } },
  });

  // Attach each value's price multiplier so we can price every combination.
  const factorsPerOption: PriceFactor[][] = product.options.map((option, i) =>
    option.values
      .sort((a, b) => a.position - b.position)
      .map((v) => ({ id: v.id, multiplier: pickers[i].values[v.position].multiplier })),
  );

  // Cartesian product of all option values = every variant.
  const combos = factorsPerOption.reduce<PriceFactor[][]>(
    (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
    [[]],
  );

  let offers = 0;
  for (const [i, combo] of combos.entries()) {
    const ids = combo.map((v) => v.id);
    const variantPrice = combo.reduce((price, v) => price * v.multiplier, p.basePrice);
    const sellerOffers = sellerIds
      .filter(() => random() < 0.55)
      .map((sellerId) => ({
        sellerId,
        productId: product.id,
        price: roundTo500(variantPrice * (0.97 + random() * 0.08)),
        // ~15% of listings are sold out so the UI has disabled options to show.
        stock: random() < 0.15 ? 0 : 1 + Math.floor(random() * 6),
      }));

    await db.variant.create({
      data: {
        productId: product.id,
        sku: `${p.slug}-${i + 1}`,
        combinationKey: [...ids].sort().join("|"),
        optionValues: { connect: ids.map((id) => ({ id })) },
        offers: { create: sellerOffers },
      },
    });
    offers += sellerOffers.length;
  }
  return { variants: combos.length, offers };
}

async function main() {
  console.log("Resetting demo data…");
  await reset();

  const sellers = await seedUsersAndSellers();
  const { brandIds, categoryIds } = await seedCatalog();
  await db.banner.createMany({ data: BANNERS.map((b, i) => ({ ...b, sortOrder: i })) });

  let variants = 0;
  let offers = 0;
  for (const p of PRODUCTS) {
    const result = await seedProduct(p, brandIds, categoryIds, sellers.map((s) => s.id));
    variants += result.variants;
    offers += result.offers;
  }

  console.log(
    `Seeded ${PRODUCTS.length} products, ${variants} variants, ${offers} offers, ${SELLERS.length} sellers.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
