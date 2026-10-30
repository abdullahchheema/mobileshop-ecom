# Trendz Mobile — refurbished-tech marketplace (modeled on Back Market)

## Context
You want a Back Market–style marketplace for Pakistan: many refurbishers (sellers) list graded used/refurbished phones, laptops, tablets etc., and buyers shop by **model → condition → storage → color**, paying in PKR. The project folder `/Users/macworld/Documents/web app trendz mobile` is empty, so this is a greenfield build.

**Important:** we copy the *structure and UX patterns*, not Back Market's brand. No logo, name, copy text, photos or colors taken from their site. Trendz Mobile gets its own identity, text and product images.

Decisions made: multi-vendor marketplace · Next.js + PostgreSQL · Pakistan / PKR · API designed so a mobile app can reuse it later.

---

## What I found on backmarket.com (what to replicate)

**Global shell**
- Top utility bar (promise, blog, ZIP/location, language), header with logo, big search ("Search for MacBook…"), help, account, cart.
- Category nav bar: Deals · Smartphones · Laptops · Tablets · Gaming · Smartwatches · Audio · Trade-in · Services.
- Floating "Ask me" chat assistant (later phase).

**Home page** — sections, top to bottom
1. Hero banner with one CTA.
2. "Most wanted" horizontal carousel of category chips (Deals, iPhone, Android, iPad, MacBook, laptops, AirPods, consoles).
3. 2 promo cards (deal on a specific model, phone + mobile plan bundle).
4. "Recommended for you" product carousel.
5. Trust block: 1-year warranty · up-to-100-point inspection · free 30-day returns · professionally refurbished.
6. Customer reviews carousel (name, rating, text, product bought).
7. More promo cards + service tiles (Express Replacement, Trade-in, Repair guides, Protection plan).
8. Top brands strip, editorial/blog stories, "As seen in" press, big footer.

**Category listing page** (`/l/iphone`)
- Breadcrumb, trust strip (warranty / shipping / returns / support), title + SEO intro.
- Quick-filter chips (colors, years) + filter dropdowns: Price, Carrier, Model, Release year, Network, "Filter" drawer; Sort (Bestsellers, price, newest).
- Product count, grid of **model cards**: image, color dots (+N more), badge ("1,000+ sold in last 30 days"), rating + review count, "Starting at" lowest refurbished price, struck-through new price.
- Promo tiles mixed into the grid; "Deals / Price drop" section below with variant-level cards + Add to cart.

**Product page** (`/p/iphone-14`) — the heart of the site
- Gallery, title, rating, current price, new price, "Save X", Add to cart.
- Delivery estimate, "works with all carriers", returns, warranty.
- Inspection checklist (battery, screen, cameras, data wipe, IMEI, water damage…).
- **Variant pickers, each option showing its own price**:
  Condition (Fair / Good / Excellent / Premium, with explanation of each grade) → Battery (standard / long-lasting) → Storage → SIM type → Color. Sold-out options greyed out.
- Trade-in box, summary of the chosen config, "Sold by <seller>", what's in the box, specs, perks, FAQ, reviews.

**Key insight for the data model:** a *product* is a model (iPhone 14). Each seller lists **offers** for one exact combination (Good · 128 GB · Blue). The product page shows the **cheapest in-stock offer** for the selected combination (the "buy box"), and every picker option shows the lowest price you'd get if you switched to it.

---

## Tech stack

| Layer | Choice |
|---|---|
| Web app | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (Neon or Supabase) + Prisma ORM |
| Auth | Better Auth — email + **phone OTP** (common in PK), roles: buyer / seller / admin; bearer-token plugin so the future mobile app can log in |
| API | REST route handlers under `/api/v1/*` + Zod validation (same endpoints the mobile app will use) |
| Payments | **Cash on Delivery** first; then **Safepay** or **PayFast** for cards, plus **JazzCash / Easypaisa** wallets |
| Images | Cloudinary (or Cloudflare R2) |
| Search | Postgres full-text + trigram to start; Meilisearch later if needed |
| Email / SMS | Resend (email), a Pakistani SMS gateway for OTP + order updates |
| Hosting | Vercel (web) + Neon (DB) |

---

## Data model (Prisma, core tables)

- `User` (role: BUYER | SELLER | ADMIN, phone, email, addresses)
- `Seller` (shop name, CNIC/NTN, bank/IBAN for payouts, status: pending/approved/suspended, commission %, rating)
- `Category` (tree: Smartphones → iPhone), `Brand`
- `Product` (the model: "iPhone 14", brand, category, specs JSON, images, new-retail price, slug)
- `ProductOption` / `OptionValue` (per product: Condition, Storage, Color, Battery, SIM — with values)
- `Variant` (one exact combination of option values for a product, e.g. Good/128GB/Blue)
- `Offer` (seller × variant: price PKR, stock qty, warranty months, status) ← what buyers actually buy
- `Cart`, `CartItem` (→ offer)
- `Order` (buyer, address, payment method, totals) → `SellerOrder` (one per seller: status, tracking, commission) → `OrderItem` (→ offer, price snapshot)
- `Payment`, `Payout` (seller earnings ledger), `Return` / `Dispute`
- Later: `Review`, `TradeInRequest`, `Wishlist`

Pricing queries: `MIN(offer.price)` grouped by product (listing "Starting at") and by option value (picker prices), only `stock > 0 AND status = ACTIVE`.

---

## Folder structure

```
trendz-mobile/
  app/
    (shop)/            page.tsx (home), l/[...slug] (category), p/[slug] (product),
                       search, cart, checkout, account/orders
    (seller)/seller/   dashboard, listings, orders, payouts, onboarding
    (admin)/admin/     sellers, products/catalog, orders, disputes, banners
    api/v1/            products, categories, offers, cart, orders, auth, seller/*, admin/*
  components/          ui/ (shadcn), layout/ (Header, CategoryNav, Footer),
                       product/ (ProductCard, VariantPicker, BuyBox, Gallery), home/ (Hero, Carousel, TrustBlock)
  lib/                 db.ts, auth.ts, pricing.ts (buy-box logic), payments/ (cod, safepay, jazzcash), validators/
  prisma/              schema.prisma, seed.ts (categories, ~30 phone models, demo sellers & offers)
```

---

## Build phases

**Phase 1 — Foundation (week 1)**
Next.js + Tailwind + shadcn setup, Prisma schema, seed data, Better Auth (phone OTP + email), design tokens (Trendz colors/fonts), Header / CategoryNav / Footer.

**Phase 2 — Storefront browsing (weeks 2–3)**
Home page (all sections above, content from DB/banners), category listing with filters + sort + pagination (URL-driven so pages are shareable and SEO-friendly), search with suggestions, product page with variant pickers, per-option prices, buy box, inspection checklist, condition guide, specs, FAQ.

**Phase 3 — Cart & checkout (week 4)**
Cart (guest cart in cookie, merged on login), address book (PK cities/provinces), shipping fee rules, checkout with **COD** first, order split into `SellerOrder`s, stock reservation, order confirmation + SMS/email, buyer "My orders" page with tracking status.

**Phase 4 — Seller side (weeks 5–6)**
Seller signup + onboarding (shop info, CNIC, bank), admin approval, seller dashboard: create offers by picking an existing catalog product + variant (sellers don't create products — keeps catalog clean, like Back Market), bulk price/stock edit, incoming orders → mark shipped with courier + tracking (TCS / Leopards / M&P / PostEx), earnings and payout history.

**Phase 5 — Admin panel (week 7)**
Approve/suspend sellers, manage catalog (categories, products, options, images), banners/home sections, all orders, returns & disputes, commission settings, payout runs (mark paid via bank transfer).

**Phase 6 — Online payments & polish (week 8)**
Safepay/PayFast card + JazzCash/Easypaisa wallet integration with webhooks, refunds, SEO (metadata, sitemap, JSON-LD Product schema), performance (image optimization, caching listing pages), Urdu/English toggle (optional).

**Later phases**
Reviews & ratings (verified buyers only), trade-in quote flow, warranty claims, wishlist & price-drop alerts, recommendations, chat assistant, **React Native (Expo) app** consuming `/api/v1`.

---

## Verification
- `npx prisma migrate dev && npx prisma db seed` — schema applies, seed loads demo catalog + 3 demo sellers.
- Unit tests (Vitest) for `lib/pricing.ts`: buy-box picks cheapest in-stock offer; picker prices update when other options change; sold-out options disabled.
- E2E (Playwright), run against `npm run dev`:
  1. Home → iPhone category → filter by storage → product page → change condition/color → price updates → add to cart → COD checkout → order appears in "My orders".
  2. Seller logs in → sees the new order → marks shipped → buyer sees status change.
  3. Admin approves a pending seller → seller can create an offer → offer appears on product page.
- Manual check in the browser pane at mobile width (375px) and desktop for every page.
