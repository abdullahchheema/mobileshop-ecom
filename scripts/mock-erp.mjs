// A local stand-in for the ERP, for developing and testing the storefront without the real one.
//   node scripts/mock-erp.mjs            (listens on :4010)
// Implements what WEBSITE_INTEGRATION.md describes: the seven `web_*` catalogue views (PostgREST style, schema "api")
// and the order API (POST /api/online/orders/, GET /api/online/orders/{ref}/, header X-API-Key).
// Dev helpers: POST /__mock/stock {product_id, condition, pta_status, device_type, quantity, price?}, POST /__mock/advance/{ref}
import http from "node:http";

const PORT = Number(process.env.MOCK_ERP_PORT ?? 4010);
const KEY = process.env.MOCK_ERP_KEY ?? "mock-key";
const svg = (bg, label) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="${bg}"/><text x="300" y="310" font-family="sans-serif" font-size="40" text-anchor="middle" fill="#222">${label}</text></svg>`);

const families = [
  { family_slug: "iphone-11", title: "iPhone 11", brand: "Apple", category: "Phones", description: "Dual camera, A13 Bionic. Tested and cleaned.", is_phone: true, cover_url: svg("#dbe7f5", "iPhone 11") },
  { family_slug: "iphone-13-pro", title: "iPhone 13 Pro", brand: "Apple", category: "Phones", description: "Pro cameras, 120Hz display.", is_phone: true, cover_url: svg("#e5dff2", "iPhone 13 Pro") },
  { family_slug: "galaxy-s21", title: "Samsung Galaxy S21", brand: "Samsung", category: "Phones", description: "Flagship Android, 5G.", is_phone: true, cover_url: svg("#f2e1ea", "Galaxy S21") },
  { family_slug: "airpods-2", title: "AirPods (2nd generation)", brand: "Apple", category: "Accessories", description: "Wireless earbuds.", is_phone: false, cover_url: svg("#eeeeee", "AirPods 2") },
  { family_slug: "pixel-6", title: "Google Pixel 6", brand: "Google", category: "Phones", description: "Sold out right now.", is_phone: true, cover_url: svg("#dff2e5", "Pixel 6") },
];
const L = (id, fam, storage, colour, category = "Phones", is_phone = true) => ({ product_id: id, slug: `${fam}-${id}`, family_slug: fam, page_title: null, name: `${fam} ${storage ?? ""} ${colour ?? ""}`.trim(), brand: families.find((f) => f.family_slug === fam).brand, model: fam, storage, colour, category, description: null, is_phone, cover_url: null });
const listings = [
  L(101, "iphone-11", "64GB", "Black"), L(102, "iphone-11", "128GB", "Black"), L(103, "iphone-11", "128GB", "White"),
  L(201, "iphone-13-pro", "256GB", "Sierra Blue"), L(301, "galaxy-s21", "128GB", "Phantom Gray"),
  L(401, "airpods-2", null, "White", "Accessories", false), L(501, "pixel-6", "128GB", "Green"),
];
const V = (id, condition, pta, price, quantity, extra = {}) => ({ product_id: id, condition, pta_status: pta, device_type: condition ? "Used" : "", price, compare_price: null, quantity, grade: null, battery_health: null, warranty_days: 365, ...extra });
const variants = [
  V(101, "Good", "PTA", 39500, 3, { compare_price: 60000, grade: "8", battery_health: 86 }), V(102, "Very Good", "PTA", 48000, 2, { compare_price: 70000 }), V(102, "Good", "Non-PTA", 44000, 1),
  V(103, "Excellent", "PTA", 55000, 1, { grade: "9", battery_health: 94, warranty_days: 0 }), V(201, "Excellent", "PTA", 123000, 2, { compare_price: 190000 }), V(301, "Good", "PTA", 62000, 4),
  V(401, "", "", 4500, 10, { warranty_days: 0 }), V(501, "Good", "PTA", 52000, 0),
];
const images = [
  { image_id: 1, family_slug: "iphone-11", variant_product_id: null, product_id: null, url: svg("#cfe0f5", "iPhone 11 front"), alt: "front", position: 0 },
  { image_id: 2, family_slug: "iphone-11", variant_product_id: null, product_id: null, url: svg("#bcd2ee", "iPhone 11 back"), alt: "back", position: 1 },
  { image_id: 3, family_slug: "iphone-11", variant_product_id: 103, product_id: 103, url: svg("#f5f5f5", "iPhone 11 White"), alt: "White iPhone 11", position: 0 },
];
const orders = new Map();
const sum = (id) => String(id);

function view(name) {
  const stockOf = (fam) => variants.filter((v) => listings.find((l) => l.product_id === v.product_id)?.family_slug === fam);
  if (name === "web_families") return families.filter((f) => stockOf(f.family_slug).some((v) => v.quantity > 0)).map((f) => {
    const vs = stockOf(f.family_slug).filter((v) => v.quantity > 0); const prices = vs.map((v) => v.price);
    return { ...f, price_from: Math.min(...prices), price_to: Math.max(...prices), discount_percent: 0, stock_total: vs.reduce((n, v) => n + v.quantity, 0), variant_count: vs.length };
  });
  if (name === "web_listings") return listings.filter((l) => variants.some((v) => v.product_id === l.product_id && v.quantity > 0));
  if (name === "web_variants") return variants.filter((v) => v.quantity > 0);
  if (name === "web_images") return images;
  if (name === "web_variant_stock") return variants.filter((v) => v.quantity > 0).flatMap((v) => v.quantity > 1 ? [{ product_id: v.product_id, condition: v.condition, pta_status: v.pta_status, device_type: v.device_type, price: v.price, shop_id: 1, shop_name: "Shop A", quantity: v.quantity - 1 }, { product_id: v.product_id, condition: v.condition, pta_status: v.pta_status, device_type: v.device_type, price: v.price, shop_id: 2, shop_name: "Shop B", quantity: 1 }] : [{ product_id: v.product_id, condition: v.condition, pta_status: v.pta_status, device_type: v.device_type, price: v.price, shop_id: 1, shop_name: "Shop A", quantity: v.quantity }]);
  if (["web_stock", "web_phone_units"].includes(name)) return [];
  return null;
}

const json = (res, status, body, headers = {}) => { res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", ...headers }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { resolve(JSON.parse(d || "null")); } catch { resolve(undefined); } }); });

function placeOrder(b) {
  const err = (status, message) => ({ status, body: { error: message } });
  if (!b || typeof b !== "object") return err(400, "Invalid JSON body.");
  if (!b.external_ref) return err(400, "external_ref is required.");
  if (orders.has(b.external_ref)) { const o = orders.get(b.external_ref); return { status: 200, body: { order: o.order, external_ref: o.external_ref, status: o.status, subtotal: o.subtotal, delivery_fee: o.delivery_fee, total: o.total, created: false } }; }
  if (!b.customer?.name || String(b.customer?.phone ?? "").replace(/\D/g, "").length < 10) return err(400, "Customer name and a phone with at least 10 digits are required.");
  if (!["Cash on Delivery", "Bank Transfer", "Easypaisa", "JazzCash", "Card"].includes(b.payment_method)) return err(400, "Unknown payment method.");
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 40) return err(400, "Between 1 and 40 lines are required.");
  const fee = Number(b.delivery_fee ?? 0); if (!(fee >= 0 && fee <= 100000)) return err(400, "delivery_fee must be 0 to 100000.");
  let subtotal = 0; const picked = [];
  for (const it of b.items) {
    const v = variants.find((x) => sum(x.product_id) === sum(it.product_id) && (it.condition ?? "") === (x.condition ?? "") && (it.pta_status ?? "") === (x.pta_status ?? "") && (it.device_type ?? "") === (x.device_type ?? ""));
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return err(400, "Each line needs a quantity of 1 to 50.");
    if (!v || v.quantity < 1) return err(409, `Variant ${it.product_id} is sold out or no longer sold.`);
    if (it.price !== undefined && Number(it.price) !== v.price) return err(409, `Price changed for product ${it.product_id}.`);
    if (v.quantity < qty) return err(409, `Not enough stock for product ${it.product_id}.`);
    subtotal += v.price * qty; picked.push([v, qty]);
  }
  const total = subtotal + fee;
  if (b.expected_total !== undefined && Math.abs(Number(b.expected_total) - total) > 0.01) return err(409, "Total differs from what the customer saw.");
  for (const [v, qty] of picked) v.quantity -= qty; // reserve the phones
  const o = { order: `ON-${String(orders.size + 1).padStart(5, "0")}`, external_ref: b.external_ref, status: "New", payment_status: b.payment_status ?? "Unpaid", courier: null, tracking: null, subtotal, delivery_fee: fee, total, placed_on: new Date().toISOString(), dispatched_on: null, delivered_on: null };
  orders.set(b.external_ref, o);
  return { status: 201, body: { order: o.order, external_ref: o.external_ref, status: o.status, subtotal, delivery_fee: fee, total, created: true } };
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return json(res, 204, {}, { "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*" });
  const m = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
  if (m) {
    if (!req.headers.apikey) return json(res, 401, { message: "No API key found in request" });
    if (req.headers["accept-profile"] !== "api") return json(res, 404, { message: "Not in schema" });
    const rows = view(m[1]);
    if (!rows) return json(res, 404, { code: "PGRST205", message: `Could not find the table 'api.${m[1]}' in the schema cache` });
    const [from, to] = (req.headers.range ?? "0-999").split("-").map(Number);
    const part = rows.slice(from, to + 1);
    return json(res, 200, part, { "Content-Range": `${from}-${from + Math.max(part.length - 1, 0)}/${rows.length}` });
  }
  if (url.pathname.startsWith("/api/online/orders")) {
    if (req.headers["x-api-key"] !== KEY) return json(res, 401, { error: "Invalid or missing API key." });
    if (req.method === "POST" && url.pathname === "/api/online/orders/") { const r = placeOrder(await readBody(req)); return json(res, r.status, r.body); }
    const t = /^\/api\/online\/orders\/([^/]+)\/$/.exec(url.pathname);
    if (req.method === "GET" && t) { const o = orders.get(decodeURIComponent(t[1])); return o ? json(res, 200, { order: o.order, external_ref: o.external_ref, status: o.status, payment_status: o.payment_status, courier: o.courier, tracking: o.tracking, total: o.total, placed_on: o.placed_on, dispatched_on: o.dispatched_on, delivered_on: o.delivered_on }) : json(res, 404, { error: "Order not found." }); }
  }
  const adv = /^\/__mock\/advance\/([^/]+)$/.exec(url.pathname);
  if (req.method === "POST" && adv) { const o = orders.get(decodeURIComponent(adv[1])); if (!o) return json(res, 404, {}); if (o.status === "New") Object.assign(o, { status: "Dispatched", courier: "TCS", tracking: "TCS-MOCK-1234", dispatched_on: new Date().toISOString() }); else if (o.status === "Dispatched") Object.assign(o, { status: "Delivered", payment_status: "Paid", delivered_on: new Date().toISOString() }); return json(res, 200, o); }
  if (req.method === "POST" && url.pathname === "/__mock/stock") { const b = await readBody(req); const v = variants.find((x) => sum(x.product_id) === sum(b.product_id) && (b.condition ?? "") === (x.condition ?? "") && (b.pta_status ?? "") === (x.pta_status ?? "")); if (!v) return json(res, 404, {}); v.quantity = b.quantity ?? v.quantity; if (b.price) v.price = b.price; return json(res, 200, v); }
  json(res, 404, { error: "not found" });
}).listen(PORT, () => console.log(`mock ERP on http://localhost:${PORT} (order key: ${KEY})`));
