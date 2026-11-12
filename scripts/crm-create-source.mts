// Creates (or rotates the credentials of) the Covison ERP integration for one seller.
//   npx tsx --env-file=.env scripts/crm-create-source.mts <seller-slug> [name] [--bearer-only | --rotate-hmac]
// Secrets are printed once. Only the SHA-256 hash of the API key is stored; the HMAC secret is stored for verification.
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { pgAdapterConfig } from "../src/lib/pg-config";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const [slug, name = "Covison ERP"] = positional;

if (!slug) {
  console.error("Usage: npx tsx --env-file=.env scripts/crm-create-source.mts <seller-slug> [name] [--bearer-only | --rotate-hmac]");
  process.exit(1);
}

const bearerOnly = flags.has("--bearer-only");
const rotateHmacOnly = flags.has("--rotate-hmac");

const db = new PrismaClient({ adapter: new PrismaPg(pgAdapterConfig().config, pgAdapterConfig().options) });

const seller = await db.seller.findUnique({ where: { slug }, select: { id: true, shopName: true, status: true, commissionBps: true } });
if (!seller) {
  console.error(`No seller with slug "${slug}".`);
  process.exit(1);
}

const hmacSecret = bearerOnly ? null : "crm_sec_" + randomBytes(32).toString("base64url");

if (rotateHmacOnly) {
  const updated = await db.crmSource.updateMany({
    where: { sellerId: seller.id },
    data: { hmacSecret },
  });
  if (updated.count === 0) {
    console.error(`No existing integration for "${slug}". Run without --rotate-hmac first.`);
    process.exit(1);
  }
  console.log(`Rotated HMAC secret for seller "${seller.shopName}".`);
  console.log("\nHMAC signing secret (shown once, store it on the ERP server):\n");
  console.log(hmacSecret);
  await db.$disconnect();
  process.exit(0);
}

const key = "crm_" + randomBytes(32).toString("base64url");
const apiKeyHash = createHash("sha256").update(key).digest("hex");
await db.crmSource.upsert({
  where: { sellerId: seller.id },
  update: { apiKeyHash, hmacSecret, name },
  create: { sellerId: seller.id, apiKeyHash, hmacSecret, name },
});

console.log(`Integration "${name}" is linked to seller "${seller.shopName}" (${seller.status}).`);
if (seller.status !== "APPROVED") console.log("  ! The seller is not approved yet; the ERP will get 401 until an admin approves it.");
if (seller.commissionBps !== 0) console.log(`  ! Commission is ${seller.commissionBps / 100}%. For your own stock, set it to 0 in Admin → Sellers.`);
console.log("\nAPI key (shown once, store it on the ERP server):\n");
console.log(key);
if (hmacSecret) {
  console.log("\nHMAC signing secret (shown once, store it on the ERP server):\n");
  console.log(hmacSecret);
} else {
  console.log("\nHMAC signing disabled (--bearer-only). Run with --rotate-hmac when ready to enforce signed requests.");
}
await db.$disconnect();
