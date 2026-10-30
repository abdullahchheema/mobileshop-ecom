# Trendz Mobile

Multi-vendor marketplace for refurbished phones and tech in Pakistan (PKR). See [PLAN.md](PLAN.md) for the full roadmap.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · shadcn/ui · PostgreSQL + Prisma 7 · Better Auth (email + phone OTP, bearer tokens for the future mobile app).

## Getting started

Requirements: Node 20+, PostgreSQL 16 running locally.

```bash
cp .env.example .env          # then fill in DATABASE_URL, BETTER_AUTH_SECRET and TEST_GATEWAY_SECRET
createdb trendz_mobile
npm install                   # also generates the Prisma client
npm run db:migrate            # apply migrations
npm run db:seed               # demo catalog, sellers, offers and test accounts
npm run dev                   # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm test` | Unit tests (Vitest), e.g. the buy-box pricing rules |
| `npm run db:migrate` | Create/apply a migration after editing `prisma/schema.prisma` |
| `npm run db:seed` | Wipe and re-seed demo data |
| `npm run db:studio` | Browse the database in Prisma Studio |

## Test accounts (local only)

The seed creates these accounts, all sharing the dev password defined as `DEV_PASSWORD` in [prisma/seed.ts](prisma/seed.ts):

| Account | Use it to |
|---|---|
| `buyer@trendz.test` | Shop, check out, track orders |
| `lahore-refurb-hub@trendz.test`, `karachi-gadget-clinic@trendz.test`, `capital-tech-renew@trendz.test` | Approved sellers: open `/seller` |
| `peshawar-phone-doctor@trendz.test` | A seller application awaiting review |
| `admin@trendz.test` | Run the marketplace at `/admin`: orders, returns, payouts, sellers, catalog, banners |

**Phone sign-in in development:** no SMS gateway is connected yet, so the OTP is printed in the dev server's terminal as `[sms] to +92…: Your Trendz Mobile code is …`.

## Project layout

```
prisma/              schema, migrations, seed + demo catalog data
src/app/[lang]/      storefront root layout (one per language) and opengraph image
  (shop)/            home, /l/[slug] categories, /p/[slug] products, /search, /deals,
                     /cart, /checkout, sign-in, /account (orders, addresses), /sell
src/app/(console)/   English-only root layout for the seller hub, admin panel and dev tools
  (seller)/seller/   seller hub: overview, orders, listings, payouts
  (admin)/admin/     admin panel: dashboard, orders, returns, payouts, sellers, products, categories, banners
  dev/               local test payment gateway
src/app/payment/     where the payment gateway sends buyers back
src/app/api/webhooks/payments/[provider]   signed payment webhooks
src/app/api/cron/    expiry of unpaid card orders (Vercel cron, see vercel.json)
src/app/api/admin/   admin-only uploads (product photos)
src/app/sitemap.ts, robots.ts, icon.svg   SEO and icons
src/i18n/            languages, en/ur dictionaries, hreflang helpers
src/lib/payments/    payment providers (Safepay, test gateway) and the payment service
src/app/actions/     Server Actions for the web (cart, addresses, orders, seller, admin)
src/app/api/auth/    Better Auth endpoints
src/app/api/v1/      public REST API shared with the future mobile app
src/components/      layout (header, nav, footer), auth forms, shadcn/ui
src/lib/             db client, auth, catalog queries, pricing (buy-box) rules, cart, orders,
                     shipping/commission rules, validators, site constants
src/proxy.ts         language routing (English unprefixed, Urdu at /ur) and signed-out redirects
```

## Online payments

Card payments go through **Safepay**; cash on delivery works as before. Which gateway is used is set by `PAYMENT_PROVIDER` in `.env`:

| `PAYMENT_PROVIDER` | Behaviour |
|---|---|
| `test` | Local test gateway at `/dev/payment-gateway` (pay, decline or cancel). Works only outside production and when `TEST_GATEWAY_SECRET` is set. |
| `safepay` | Real Safepay checkout. Needs `SAFEPAY_ENV` (`sandbox` or `production`), `SAFEPAY_API_KEY`, `SAFEPAY_SECRET_KEY` and `SAFEPAY_WEBHOOK_SECRET`. |

If the chosen gateway isn't configured, checkout simply hides the card option.

How it works (`src/lib/payments/service.ts`):

- A card order reserves its stock and has 30 minutes to be paid (`paymentDueAt`). Sellers don't see it until it's paid.
- The buyer is sent to the gateway. On return we ask the gateway for the real status; the browser redirect alone proves nothing.
- The signed webhook (`/api/webhooks/payments/safepay`, HMAC-SHA512 of the raw body) is the source of truth. It is idempotent and checks the amount and currency.
- `/api/cron/expire-payments` (every 5 minutes, `Authorization: Bearer $CRON_SECRET`) cancels unpaid orders after re-checking the gateway. A payment that arrives after expiry is refunded automatically.
- Cancelling a paid order, a seller cancellation, and admin return refunds all refund through the gateway.

**Before going live with Safepay:** in the sandbox, verify the points marked `VERIFY IN SANDBOX` in `src/lib/payments/safepay.ts` (amount units, response field paths, state names) and register the webhook URL in the Safepay dashboard. JazzCash and Easypaisa show as "coming soon".

## Languages (English / Urdu)

- English pages have no prefix (`/p/iphone-14`); Urdu pages live under `/ur` (`/ur/p/iphone-14`) and render right to left in Noto Naskh Arabic. `/en/...` redirects to the clean URL. The header's language switch keeps you on the same page.
- Storefront copy lives in `src/i18n/dictionaries/en.ts` and `ur.ts`. `ur.ts` is typed against the English dictionary, so a missing key is a type error. Server components use `getDict(lang)`; client components use `useI18n()`.
- Use the `Link` from `@/components/i18n/link` in storefront code: it adds `/ur` when needed. For server redirects outside a page (actions, route handlers), use `localized()` from `src/i18n/server.ts`.
- Use logical Tailwind classes (`ms-`, `pe-`, `start-`, `text-start`) and add `rtl:-scale-x-100` to arrow icons. Wrap phone numbers inside Urdu sentences with `ltr()`.
- Catalog data (product names, colors, specs) stays as entered. Condition grades, PTA status and top-level categories are translated, and home banners have optional Urdu fields in the admin panel.
- The seller hub and admin panel are English only.

## SEO

Every storefront page sets a canonical URL and `hreflang` alternates (`alternatesFor` in `src/i18n/seo.ts`). `/sitemap.xml` lists categories and products in both languages; `/robots.txt` keeps private pages out. Product pages include `Product` and `BreadcrumbList` JSON-LD, and the home page `Organization` and `WebSite` (search box). Set `NEXT_PUBLIC_APP_URL` to the real domain in production, since all absolute URLs come from it.

## Notes for contributors

- **Cache Components is on.** Shared database reads use `"use cache"` (see `src/lib/catalog.ts`). Anything per-request (session, cookies) must render inside `<Suspense>` and go through `getSession()` in `src/lib/session.ts`.
- **Money is whole rupees** stored as `Int`. Format it with `formatPkr()` from `src/lib/site.ts`.
- **Prices on cards and product pages must agree.** A card's "From" price is the cheapest buyable offer matching the listing filters; the product page opens on that same configuration (`selectionFromParams` in `src/lib/pricing.ts`).
- **Catalog model:** a `Product` is a model (iPhone 14). Its `ProductOption`s (Condition, Storage, PTA status, Color) combine into `Variant`s. Sellers list `Offer`s on variants, and buyers buy offers.
- **Orders are split per seller.** Checkout creates one `Order` with a `SellerOrder` per seller; each pays its own delivery fee (`src/lib/shipping.ts`) and platform commission. Stock is reserved at checkout with a conditional decrement, so the last unit can't be sold twice, and returned to stock when an order is cancelled.
- **Never trust client prices.** Checkout recomputes totals from the database and rejects the order if they differ from the `expectedTotal` the buyer saw.
- **Sellers.** Anyone can apply at `/sell/apply`; the account only becomes `SELLER` when an admin approves it (`setSellerStatus` in `src/lib/sellers.ts`). Suspending a seller hides all of their offers instantly, because buyable offers require an approved seller.
- **Fulfilment rules live in `src/lib/fulfillment.ts`:** confirm → ship (courier + tracking) → deliver, or cancel before shipping. The buyer's order status is rolled up from every seller's shipment; a seller cancellation restocks the items and removes them from the buyer's cash-on-delivery total. Cash on delivery is marked paid once everything is delivered.
- **Seller earnings** = items + delivery fee − commission, payable once delivered (`sellerEarning`).
- **Returns and payouts (`src/lib/returns.ts`, `src/lib/payouts.ts`).** Buyers can return an item within 15 days of delivery: requested → approved → received → refunded (or rejected). Seller earnings are only paid once the return window has closed and no return is open, so a refund can never claw back money already paid. Refunds come off the seller's earning, along with the matching share of commission. A fully refunded order becomes `RETURNED` with payment `REFUNDED`.
- **Payout runs.** Admin creates a payout per seller (bundles eligible shipments, status `PENDING`), sends the bank transfer, then marks it paid with the reference; the seller gets an SMS.
- **Catalog edits.** Products start with the four condition grades. Options (storage, color…) can only be added or removed before any listing exists; values can be added any time and removed only if nobody lists them.
- **Product photos** are uploaded through `/api/admin/products/:id/images` and validated by their bytes (JPEG/PNG/WebP, 5 MB max). In development they're saved to `public/uploads` (git-ignored). **Before deploying, replace `saveProductImage`/`deleteProductImage` in `src/lib/storage.ts` with Cloudinary or R2** — serverless disks are read-only.
- **Forms handled in JavaScript use `method="post"`**, so a submit before hydration never puts fields (passwords, IBANs) in the URL. `ActionForm` (`src/components/console/action-form.tsx`) is the standard admin form.
- **After sign-in/out, use a full page load** (`navigateAfterAuth`), not `router.push`: the client router caches session-specific pages and redirects.

## Mobile API (`/api/v1`)

Authenticate with `Authorization: Bearer <token>`; the token comes from the `set-auth-token` response header of any Better Auth sign-in (`/api/auth/sign-in/email`, `/api/auth/phone-number/verify`). Errors are `{ "error": { "code", "message" } }`.

| Method | Path | |
|---|---|---|
| GET | `/api/v1/categories` | Category tree (public) |
| GET | `/api/v1/search/suggest?q=` | Search suggestions (public) |
| GET | `/api/v1/cart` | Cart grouped by seller, with totals |
| POST | `/api/v1/cart/items` | `{ offerId, quantity }` |
| PATCH / DELETE | `/api/v1/cart/items/:id` | `{ quantity }` (0 removes) |
| GET / POST | `/api/v1/addresses` | List / create |
| GET / POST | `/api/v1/orders` | List / place `{ addressId, paymentMethod: "COD" \| "CARD", expectedTotal }`. A card order returns `paymentUrl` to open in a browser. |
| GET | `/api/v1/orders/:id` | Order detail |
| POST | `/api/v1/orders/:id/cancel` | Cancel while no seller has confirmed |
