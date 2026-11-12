# Trendz Mobile storefront

The online store for the shop's refurbished phones and tech (PKR, English and Urdu). It is a **pure storefront**: the
ERP is the single source of truth for stock, prices, photos, orders, refunds and accounting. This app owns **no data**:
no database, no admin dashboard, no customer accounts.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · shadcn/ui · `@supabase/supabase-js`.

```
Browser ──► Next.js (this app)
              ├─ reads  ─► the ERP's Supabase views (schema "api", publishable key)   catalogue, stock, photos, prices
              └─ orders ─► ERP  POST /api/online/orders/  (X-API-Key, server only)     reserve stock, create the order
```

The ERP's own description of this contract is in [docs/erp-integration-guide.md](docs/erp-integration-guide.md). How this
app implements it, and how to test it, is in [docs/erp-integration.md](docs/erp-integration.md).

## Getting started

Requirements: Node 20+.

```bash
cp .env.example .env.local     # fill in the ERP's URL, publishable key, and (server only) the order API key
npm install
npm run dev                    # http://localhost:3000
```

No ERP at hand? Run the built-in mock, which follows the same contract with sample phones and accessories:

```bash
node scripts/mock-erp.mjs      # http://localhost:4010 (order key: mock-key)
# .env.local:  NEXT_PUBLIC_SUPABASE_URL=http://localhost:4010  NEXT_PUBLIC_SUPABASE_ANON_KEY=x
#              ERP_API_URL=http://localhost:4010               ERP_API_KEY=mock-key
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## How it works

- **Catalogue** (`src/lib/catalog.ts`, `src/lib/erp-mapping.ts`): the four `web_*` views are read together and cached for
  about a minute, then mapped onto the screens' shapes: a model page is a *family*, its Storage and Colour choices come from
  the *listings*, and Condition / PTA status / price / stock come from each *variant*.
- **Cart** (`src/lib/cart-store.ts`): lives in the browser (localStorage) and holds only variant keys and quantities,
  never prices. `/api/cart/lines` prices it from the ERP's current data.
- **Checkout** (`src/app/api/checkout`): cash on delivery only. The server rebuilds the order from the ERP's data, compares
  the total with what the customer saw, and sends it to the ERP with a retry-safe reference (`TM-…`). The ERP re-checks stock
  and price, so a stale page can never oversell. The ERP key never reaches the browser.
- **Orders** (`/order/[ref]`, `/orders`): tracking reads the ERP's order status by reference. "My orders" lists orders placed
  on this device. Returns and refunds are handled by the shop (the ERP's online team).
- **Banners** (`src/lib/banners.ts`) and **delivery fee** (`src/lib/shipping.ts`: Rs 250, free from Rs 30,000) are fixed in code.

## Deploying

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` **before building** (Next bakes `NEXT_PUBLIC_*` into the
build), and `ERP_API_URL`, `ERP_API_KEY` on the server (never `NEXT_PUBLIC_`, never committed). Optional
`SUPABASE_URL` / `SUPABASE_ANON_KEY` are read when the server starts and take precedence, so the ERP can be repointed
without a rebuild. Set `NEXT_PUBLIC_APP_URL` to the public address.

## Notes for contributors

- **Cache Components is on.** The catalogue read uses `"use cache"` with the built-in `minutes` profile; a shorter profile
  makes Next treat every page as dynamic. Anything per-request must render inside `<Suspense>`.
- Photos come from the ERP's Supabase Storage host (allowed in `next.config.ts` for `next/image`).
- English and Urdu text live in `src/i18n/dictionaries`; every key must exist in both.
- The pages linked from the footer (help, about, journal, trade-in…) are placeholders that were never built.
