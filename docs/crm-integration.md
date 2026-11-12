# Covison ERP ↔ Trendz Mobile integration

> **Current design (shared database, E-commerce run from the ERP).** The ERP and the website live in one Supabase Postgres (schemas `covison_app` and `trendz`, separate roles). The website reads the ERP's `covison_app.online_stock` view for listings (`src/lib/erp-stock.ts`, refreshed by `POST /api/erp/v1/stock/refresh` and the `/api/cron/erp-stock` safety net). Online orders, returns, listings and products are run from the ERP's **E-commerce** section, which calls the signed `/api/erp/v1/*` routes (`src/app/api/erp/v1`, helpers in `src/lib/erp-api.ts`). The website's own admin no longer has Orders, Returns or ERP-sync pages. Seller accounts and sign-up were removed. Deployment: `supabase/CLOUD_DEPLOY.md` in the ERP repo. The sections below describe the original HTTP design (phases 1-4); the order booking, follow-ups and HMAC signing described there are still used.

## What the ERP can call (`/api/erp/v1/*`, Bearer key + HMAC, limited to the shop that owns the key)

| Route | Does |
|---|---|
| `POST stock/refresh` | Re-read `online_stock` and update listings |
| `GET orders`, `GET orders/:id` | Online orders and their shipments, with the next steps allowed |
| `POST orders/:id/fulfil` | Confirm, ship (courier + tracking), deliver or cancel one shipment (`applyFulfillment`) |
| `POST orders/:id/cancel` | Cancel an order, refunding a card payment first (`cancelOrder`) |
| `GET returns`, `POST returns/:id` | Return requests; approve, reject, receive, refund (`applyReturnAction`) |
| `GET listings`, `GET listings/:id`, `POST listings/:id/map` or `/unmap` | Link ERP stock groups to website variants |
| `GET catalog/products`, `GET catalog/lookups` | Products with options, brands and categories, for the forms |
| `GET products`, `GET/POST products/:id`, `POST products/:id/specs` | Product list, details and specifications |
| `POST products/:id/images`, `/images/remove`, `/images/first` | Photos (uploaded as base64, so requests can be signed) |

Creating brand-new products, categories, brands and option values is still done in the website admin.

Covison ERP (the shop system in `ERP-MobileShop-main`: Django 5.2 + self-hosted Supabase, four shops, serialized phones, POS, ledger) stays a **separate app**. Trendz is the online storefront. They exchange data over HTTPS; they never share a database.

## Decisions made

| Decision | Choice |
|---|---|
| How the shops appear on Trendz | **One combined seller** (e.g. "Covison"). Stock from every shop is summed into that seller's offers. |
| Source of truth for stock | Covison ERP. Trendz never edits synced offers' stock by hand. |
| Source of truth for orders | Trendz until an order is pushed; then the ERP books it. |
| Direction of calls | **ERP → Trendz (outbound only).** The ERP sits on a shop LAN over plain HTTP, so Trendz cannot reach it. A sync job on the ERP server calls Trendz. |
| Catalog | Not auto-created. Each ERP stock group is mapped by an admin to an existing Trendz variant. Unmapped groups are stored and shown, never listed. |

## How the data lines up

| Covison ERP | Trendz |
|---|---|
| `Product` (model + storage + RAM + colour) × `Device.condition` × `Device.pta_status` | one `Variant` (mapped by an admin) → one `Offer` of the combined seller |
| count of `Device` rows with `status = Available` across all shops | `Offer.stock` |
| lowest `asking_price` among those devices | `Offer.price` |
| `Device.warranty_days` | `Offer.warrantyMonths` (days / 30, rounded) |
| `Branch` | not visible on Trendz; used when an order is booked |

Rules that follow from the above:

- **Price.** The lowest asking price in the group is advertised. When an order is placed, the ERP must allocate the cheapest matching device, so the price shown is the price of the unit that ships.
- **Warranty.** Trendz requires at least 12 months. A group whose warranty is shorter is **rejected** with a reason instead of being listed with a warranty the shop did not give.
- **Whole rupees.** ERP decimals are rounded to whole rupees. Prices outside Rs 1,000 – 5,000,000 are rejected (this also catches the ERP default of `0`).
- **Stock** above 999 is capped at 999.
- **Commission** for the combined seller should be set to 0 in the admin panel: it is the owner's own stock, and Safepay settles to the owner directly, so no payout run is needed for it.

## Phases

### Phase 1 — Stock sync, ERP → Trendz *(built and tested end to end; not yet deployed)*

Trendz:
- `CrmSource` (one per ERP, linked to the combined seller, holds a hashed API key).
- `CrmListingMap` (one row per ERP stock group: `crmProductCode + crmCondition + ptaStatus`; `variantId` is null until an admin maps it; remembers last price, stock and sync time).
- `POST /api/integrations/crm/stock` — Bearer key; body is a **full snapshot**. Groups missing from a snapshot are set to stock 0 (sold out). Per-item validation: bad items are returned in `rejected`, good ones still apply.
- `scripts/crm-create-source.mts` — creates a source for an approved seller and prints the API key once.

Also built:
- Admin screen `/admin/erp-sync` to map each ERP group to a product and variant (suggests the product from the ERP name; unmapping sells the listing out).
- ERP side (new files only, in the ERP repo): `offline/shop/trendz_sync.py` and the `sync_trendz_stock` management command (read-only; groups available `Device` rows by product, condition, PTA status; retries with back-off; https required), a `trendz-sync` sidecar container (`supabase/compose.trendz-sync.yaml`, started with `supabase/trendz_sync.py`) because `crm-web` has no internet access, and `supabase/TRENDZ_SYNC.md`. 20 new ERP tests; the ERP's full suite (395 tests) passes.

Remaining before it is live: add the `TRENDZ_*` settings, release a new ERP image that contains the new files, deploy Trendz with `https`, map the groups, and confirm the real condition values staff enter. The ERP's counter purchases do not record warranty days, so `TRENDZ_ONLINE_WARRANTY_DAYS` must be set.

### Phase 2 — Orders, Trendz → ERP *(built and tested end to end; not yet deployed)*

Built on both sides and verified with a real two-system run (COD, card-paid, a phone sold elsewhere first, the overselling guard). Trendz: `/api/integrations/crm/orders` and `/orders/ack`, `CrmOrderSync`, the pending-stock guard, and the attention lists in Admin → ERP stock sync. ERP: `offline/shop/trendz_orders.py`, the `setup_trendz_orders` command and `TRENDZ_BOOK_ORDERS`; its full suite (413 tests) passes. Original design notes:

- Pull model: the ERP sync job fetches new paid or cash-on-delivery orders from Trendz (`GET /api/integrations/crm/orders?after=…`) and acknowledges each.
- For each order line the ERP picks the cheapest `Available` device in the group, marks it reserved, and posts a Sales Invoice in **that device's shop** (the ledger is per shop). A paid card order also gets a Payment Entry; cash on delivery stays receivable until delivery.
- Needs in the ERP: a service user, an "Online" staff member with `can_sell`, and a customer `Party` created from the order. Idempotent via the ERP's existing `RequestKey`.
- Open question to verify before building: whether a `Reserved` device status is safe everywhere the ERP reads `status`.

#### Phase 2 design (as built)

Direction: the ERP **pulls** orders and **acknowledges** them, so nothing needs to reach into the shop LAN.

1. `GET /api/integrations/crm/orders` returns the combined seller's orders that are eligible (cash on delivery, or card and paid; not cancelled/returned; placed after the integration was created) and not yet acknowledged. Each item carries its price, quantity and the ERP stock groups its variant is mapped to.
2. The ERP picks the cheapest available phone(s) in those groups, locks them, and books **one Sales Invoice per phone** in that phone's shop using its own posting code (so ledger, cost and stock move exactly like a counter sale). Paid card orders also get a payment entry. The whole order is booked or nothing is.
3. `POST /api/integrations/crm/orders/ack` reports `BOOKED` (with the ERP document codes) or `FAILED` (with a reason, e.g. the phone sold in the shop first).
4. **Overselling guard:** until an order is acknowledged, Trendz subtracts its quantity from every stock snapshot, so a snapshot taken before the ERP booked the phone cannot put it back on sale.
5. Only a phone that is no longer available (or missing) is `FAILED`. Setup problems (no online staff member, payment method missing, closed accounting day) are never reported as failures: the ERP logs them and retries, and Trendz lists orders left unacknowledged for more than 30 minutes.
6. Admin → ERP stock sync shows what needs attention: failed orders, stuck orders, and orders cancelled after they were booked (reversing those in the ERP is phase 3).

Not booked in phase 2: the delivery fee (it is a Trendz charge to the buyer, not shop revenue), cash-on-delivery collection (the invoice stays outstanding until phase 3 marks delivery), cancellations and returns.

### Phase 3 — After booking: delivery, cancellation, returns *(built and tested end to end; not yet deployed)*

Built on both sides and verified with a real two-system run (COD delivered and collected, COD cancelled, paid card cancelled, a collected order then returned and refunded, plus a repeat cycle that did nothing). Trendz: `GET /api/integrations/crm/orders/updates` and `POST .../updates/ack`, `collectedAt` / `reversedAt` on `CrmOrderSync`, `CrmReturnSync`, and a "Waiting for the shop system" list in Admin → ERP stock sync. ERP: `offline/shop/trendz_followups.py`; its full suite (430 tests) passes. Details for operators are in the ERP's `supabase/TRENDZ_SYNC.md`.

Two decisions made while building, both because the ERP's own rules forced them:
- **The delivery fee is not booked in the ERP.** Its returns cannot reverse a service line, so booking the fee would leave the books wrong after every paid cancellation or return. (Phase 2 already left it out; an attempt to book it was rolled back.)
- **A paid order that is cancelled is undone as a return credit plus a refund**, not by cancelling the invoice, because the ERP refuses to cancel an invoice that has had a payment. An unpaid order is simply cancelled.
- **Returned phones are held off online sale until staff inspect them**; phones for orders that were cancelled before shipping keep their inspection status.

Original plan for this phase (kept for reference): shipped / delivered / returned / refunded status from Trendz into the ERP (returns use the ERP's partial-return service); customers synced.

### Phase 3 plan notes
Shipped / delivered / returned / refunded status from Trendz into the ERP (returns use the ERP's partial-return service); customers synced.

### Phase 4 — Hardening *(Trendz side built; ERP-side HMAC headers & reconciliation check pending in ERP repo)*
Built on Trendz (`src/lib/crm-hmac.ts`, `src/lib/crm-reconcile.ts`, `/api/integrations/crm/reconciliation`, and Admin → ERP stock sync):
- **HMAC-signed requests on top of the Bearer key:** `CrmSource.hmacSecret` (provisioned by `scripts/crm-create-source.mts`, or added to an existing source with `--rotate-hmac`). When set, every `GET`/`POST` under `/api/integrations/crm/*` requires:
  - `X-Crm-Timestamp`: Unix epoch seconds (must be within ±300s to block replay).
  - `X-Crm-Signature`: hex (or `sha256=<hex>`) HMAC-SHA256 over `<timestamp>.<METHOD>.<pathname+search>.<rawBody>`.
  - Sources created with `--bearer-only` (or before this migration) continue working with Bearer-only until `--rotate-hmac` is run.
- **Reconciliation report & mismatch alerts:**
  - `GET /api/integrations/crm/reconciliation` returns per-group and per-variant ERP vs Trendz offer comparison, unacknowledged order deductions, orphaned offers, stale sync/group status, and structured `alerts`.
  - `POST /api/integrations/crm/reconciliation` accepts a live `{ items }` snapshot for a **read-only** comparison (`LIVE_ERP_DRIFT`, `MISSING_IN_TRENDZ`, `MISSING_IN_ERP`) without modifying Trendz listings.
  - Admin → ERP stock sync surfaces mismatch alerts, rejected items from the last snapshot, a **Reconciliation** tab, and a one-click **Rebuild Trendz offers** repair action.
- **Idempotent retries:** `POST /api/integrations/crm/orders/updates/ack` preserves original `collectedAt` / `reversedAt` timestamps when retried.

Remaining on the ERP side (`ERP-MobileShop-main`): send `X-Crm-Timestamp` and `X-Crm-Signature` on outbound requests, optionally call `GET`/`POST /api/integrations/crm/reconciliation` on a schedule and alert on mismatches, and enforce HTTPS egress/tunneling in production.

#### ERP-side HMAC header format (Python reference)
When `CrmSource.hmacSecret` is set (`scripts/crm-create-source.mts` without `--bearer-only`, or `--rotate-hmac`), sign every outbound request as:

```python
import hashlib, hmac, time
from urllib.parse import urlsplit

def crm_hmac_headers(secret: str, method: str, full_url: str, raw_body: bytes = b"") -> dict[str, str]:
    ts = str(int(time.time()))
    parts = urlsplit(full_url)
    path_and_query = parts.path + (f"?{parts.query}" if parts.query else "")
    payload = f"{ts}.{method.upper()}.{path_and_query}.".encode("utf-8") + raw_body
    sig = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return {"X-Crm-Timestamp": ts, "X-Crm-Signature": sig}
```

#### Smoke-testing Trendz endpoints
Run `scripts/crm-smoke-test.mts` against a running Trendz server (read-only by default; pass `--write` to also test a `full: false` stock snapshot):

```bash
CRM_API_KEY=crm_... CRM_HMAC_SECRET=crm_sec_... npx tsx scripts/crm-smoke-test.mts
```

## Not yet verified
- The condition strings your staff actually enter (free text in the ERP, default "Not Inspected"). The map key uses the raw string, so no guessing is needed, but the admin will see whatever is there.
- Nothing has been run against the real ERP database; the Trendz side is tested with synthetic snapshots only.
- The ERP still holds demo data and is not yet handed over to production (see its `README.md`).
