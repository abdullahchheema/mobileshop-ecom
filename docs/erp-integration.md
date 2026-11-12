# ERP integration: how this storefront implements the contract

The ERP's contract is [erp-integration-guide.md](erp-integration-guide.md). This page records how the storefront follows it,
the decisions made, and how to test.

## Decisions
- **No database, no accounts, no admin.** Customers check out as guests; the cart is in the browser; "My orders" lists
  orders placed on this device.
- **Tracking needs the order number and the phone it was placed with.** The ERP's status endpoint does not check who asks,
  so the website does: the order number is `TM-<id>-<check>`, where `<check>` is an HMAC of the phone made with `ERP_API_KEY`
  (`src/lib/order-ref.ts`). `POST /api/orders/track` verifies it (rate-limited) before asking the ERP. Nothing is stored.
- **Five payment methods** are offered (Cash on Delivery, Bank Transfer, Easypaisa, JazzCash, Card) with an optional
  transaction id. The website never sends `payment_status`; for prepaid methods the shop confirms the payment before
  dispatch. It shows no bank or wallet numbers (none were supplied): the shop contacts the customer.
- **Returns and refunds** are handled by the shop; the order page tells the buyer to contact the shop with the reference.
- **Delivery fee:** priced from the ERP's settings (`GET /api/online/config/`: default fee, free-delivery amount, a province's own fee;
  Rs 250 / free from Rs 30,000 only while the ERP cannot be reached), sent as `delivery_fee`; the ERP re-checks the fee and the total (`expected_total`).
- **Amounts** (`price`, `delivery_fee`, `expected_total`) are sent as text with exactly two decimals, added up in paisa.

## What is where
| Guide section | Code |
|---|---|
| 2. Reading the catalogue | `src/lib/supabase.ts` (client), `src/lib/catalog.ts` (fetch + cache), `src/lib/erp-mapping.ts` (views → screens) |
| 3. Placing an order | `src/app/api/checkout/route.ts`, `src/lib/erp-orders.ts` (payload, response mapping) |
| 3. Order status | `src/app/api/orders/track/route.ts`, `src/components/orders/order-tracker.tsx`, `src/lib/order-ref.ts`, `getErpOrder` |
| Environment | `src/lib/env.ts` (checked at startup by `src/instrumentation.ts`; a production server without its variables refuses to start) |
| Cart | `src/lib/cart.ts`, `src/lib/cart-store.ts`, `src/app/api/cart/lines/route.ts` |

Variant identity = `product_id | condition | pta_status | device_type` (`variantKey`). It is the cart line id and the way the
server finds the exact `web_variants` row to send.

## Checklist from the guide, and where it is verified
- [x] Catalogue reads with the publishable key and `Accept-Profile: api` (the views answer; empty until a model has a photo).
- [x] Private tables are refused with that key (checked against the live ERP: `PGRST205`).
- [x] A COD order returns 201 and the phone leaves the website (mock ERP; the real one needs `ERP_API_KEY`).
- [x] The same `external_ref` twice returns the same order (`TM-…` is created once per checkout and reused on retry).
- [x] A wrong price or a sold-out phone returns 409 and the cart is refreshed (tested after changing the ERP behind a cached page).
- [x] `ERP_API_KEY` is read only in server code (`src/lib/erp-orders.ts`, `src/lib/order-ref.ts`); it is not `NEXT_PUBLIC_`. `npm run build && npm run check:bundle` fails if the key, its name or a service key appears in `.next/static`.
- [x] No old dashboard, order tables or admin routes remain (`/admin`, `/account`, `/sell`… are 404).
- [ ] Against the real ERP: place a COD order and see it under Online Orders (needs the key and a model with a photo).
- [ ] Against the real ERP: a prepaid order (e.g. Easypaisa) shows `payment_method` and stays Unpaid.

## Testing without the ERP
`node scripts/mock-erp.mjs` serves the seven `web_*` views and the order API with sample data. Helpers: `POST
/__mock/stock {product_id, condition, pta_status, quantity?, price?}` changes stock or price behind the storefront's back;
`POST /__mock/advance/{ref}` moves an order New → Dispatched → Delivered.

## Gotchas found while building this
- `NEXT_PUBLIC_*` values are baked in at build time, so the ERP's address cannot be changed by editing environment variables
  after building. `SUPABASE_URL` / `SUPABASE_ANON_KEY` are read at runtime and win when set.
- A cache profile shorter than the built-in `minutes` makes Next treat every page as dynamic.
- The embedded browser pane only finishes streamed pages while it is visible.
- Sign-up spam: the checkout route has a honeypot, a validation cap (60 requests / 10 min / IP) and an order cap (8 / 10 min / IP).
  The limiter is in memory, per server process.
