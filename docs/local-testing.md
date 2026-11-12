# Testing the ERP ↔ Trendz sync on one Mac

Everything runs on this Mac: Trendz in `npm run dev`, and the Covison ERP in Docker. The ERP's sync container reaches Trendz at `http://host.docker.internal:3000`, the Mac as seen from inside Docker. Plain `http` is allowed only for this local address. It is the same flow that will later run over HTTPS to the Hostinger VPS.

```
ERP (Docker, localhost:8080) ── covison-trendz-sync, every 60 s, signed requests ──► Trendz (localhost:3000)
```

## 1. Start both systems

1. Docker Desktop running. The ERP stack is started the usual way (`python3 supabase/control.py up -d` in `ERP-MobileShop-main`).
2. Trendz: PostgreSQL running, then `npm run dev` in this folder. The sync fails with "Could not reach Trendz" whenever this is not running, and recovers by itself.
3. Sync container (in `ERP-MobileShop-main`):

   ```bash
   python3 supabase/trendz_sync.py up -d --no-deps trendz-sync
   python3 supabase/trendz_sync.py logs --tail 30 -f trendz-sync
   ```

   Add `--force-recreate` after changing anything in `supabase/server/.env`.

Local settings in `ERP-MobileShop-main/supabase/server/.env`: `TRENDZ_URL=http://host.docker.internal:3000`, `TRENDZ_API_KEY`, `TRENDZ_HMAC_SECRET`, `TRENDZ_ONLINE_WARRANTY_DAYS=365`, `TRENDZ_BOOK_ORDERS=1`, `TRENDZ_SYNC_SECONDS=60`. Run one cycle immediately instead of waiting:

```bash
docker exec covison-trendz-sync python manage.py sync_trendz_stock
```

## 2. Logins (local only)

The password for the website accounts is `DEV_PASSWORD` in `prisma/seed.ts`.

| Who | Login | Where |
|---|---|---|
| Buyer | `buyer@trendz.test` | http://localhost:3000 |
| Trendz admin (runs orders, returns and the ERP sync) | `admin@trendz.test` | http://localhost:3000/admin/orders |
| ERP | `owner@covison.local`, password in `ERP-MobileShop-main/supabase/private/SERVER-LOGIN.txt` | http://localhost:8080/desk/mobile-shop |

There are no seller logins. The shop's online stock belongs to one internal "Covison" record that the ERP fills. **Orders, returns, listings and product photos are run from the ERP**: sign in as a manager and use the **E-commerce** menu (Online orders, Online returns, Online listings, Online products). The website admin keeps the dashboard (read-only), payouts, sellers, banners, and creating new products and categories.

## 3. Test checklist

Tick each one. "Sync" means wait 60 s or run the one-cycle command above.

**Stock**
- [ ] In the ERP, add a phone with an asking price (or change one's price), then sync. The log shows `accepted N, rejected 0`, and the Trendz product page shows the new stock and lowest price.
- [ ] Sell that phone at the ERP counter, then sync. Trendz stock drops (to 0 means "sold out").
- [ ] Add a phone of a model or condition Trendz has never seen, then sync. It appears as **unmapped** in Admin → ERP stock sync and is not listed until you map it.
- [ ] Remove a phone's asking price. It leaves the online stock, and the log counts it as "without an asking price".

**Orders (cash on delivery)**
- [ ] As the buyer, order a Covison phone with COD, then sync. The log shows `order TZ-0000NN: booked as SALE-…`, and the ERP shows a Sales Invoice from **Online sales (Trendz)** in the shop holding the cheapest matching phone.
- [ ] In the ERP, E-commerce → Online orders → the order: Confirm → Mark as shipped → Mark as delivered. The cash receipt appears in the accounts straight away (no waiting for the next sync). The log shows `cash collected: done as PAY-…`, and the ERP invoice is paid.

**Cancellations, returns, conflicts**
- [ ] Place another order, sync, then cancel it in the ERP ("Can't fulfil this shipment" after confirming, or "Cancel whole order" before): the ERP invoice is cancelled at once. The log shows `(cancelled): done as …`, and the phone is back on sale in both systems.
- [ ] Return: deliver an order, request a return as the buyer, approve and refund it in Admin → Returns, then sync. The ERP gets a return credit, and the phone stays **off** online sale until staff pass its inspection.
- [ ] Overselling: put a phone in the buyer's cart, sell the same phone at the ERP counter, then place the online order and sync. The order shows as **failed** in Admin → ERP stock sync, and you cancel and refund it there.
- [ ] Card payment: set `PAYMENT_PROVIDER="test"` in `.env`, pay by card with the built-in test gateway, then sync. The invoice also gets a payment entry.

**Security and failures**
- [ ] Stop Trendz (`Ctrl-C` on `npm run dev`). The sync log shows "Could not reach Trendz" every cycle. Start it again and the next cycle catches up.
- [ ] In `server/.env`, change one character of `TRENDZ_HMAC_SECRET`, then run `up -d --force-recreate`. The log says the signature was refused. Put it back.
- [ ] Admin → ERP stock sync → **Reconciliation** shows no mismatch alerts at the end.

## 4. Automated tests

```bash
npm test && npm run typecheck
```

ERP suite: it needs a database user that may create a test database. Run it from `ERP-MobileShop-main/supabase/server`:

```bash
docker exec -e DATABASE_USER=postgres -e DATABASE_PASSWORD="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)" covison-trendz-sync python manage.py test shop --noinput
```

## 5. Before moving to the VPS

The local keys belong to the local database only. On the VPS, create a new source with `scripts/crm-create-source.mts` and replace `TRENDZ_URL`, `TRENDZ_API_KEY` and `TRENDZ_HMAC_SECRET` in the shop server's `.env`. A backup of the ERP env from before signing was enabled is at `supabase/server/.env.bak-before-hmac`; delete it once you're happy.

## 6. Shared-database mode on one Mac

The website reads the ERP's `online_stock` view, as in production. On this Mac the two databases are separate servers, so:

1. ERP: `docker exec covison-trendz-sync python manage.py migrate shop` (creates the view, migration `0009`).
2. A read-only role for the website, and a local tunnel to the ERP database (a throw-away `alpine/socat` container on the ERP network publishing port 54329). The role may only `SELECT covison_app.online_stock`; it cannot read devices, customers or staff.
3. Website `.env`: `ERP_STOCK_DATABASE_URL="postgresql://trendz_app:…@localhost:54329/postgres"` and `ERP_ONLINE_WARRANTY_DAYS="365"`.
4. ERP `supabase/server/.env`: `TRENDZ_STOCK_MODE=shared` (and `TRENDZ_REFRESH_ON_CHANGE=1` on the app server). The worker then logs "Trendz refreshed from the shared database".

The ERP app container (`crm-web`) has no internet by design in the local stack, so E-commerce pages are exercised from the sync container with Django's test client (see the ERP repo's `tests_ecommerce.py`), or in production where the app server has internet.
