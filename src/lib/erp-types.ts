// Rows of the ERP's public catalogue views (schema `api`). Numbers can arrive as strings (Postgres numeric), so every
// consumer converts with Number(). See the ERP's WEBSITE_INTEGRATION.md for the column meanings.

/** web_families: one row per page (phone model / accessory). */
export type FamilyRow = {
  family_slug: string;
  title: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  /** Grouped for display: { "Display": { "Screen size": "6.9 inch" } }. May be empty. */
  specs?: Record<string, Record<string, string>> | null;
  is_phone: boolean;
  price_from: number | string | null;
  price_to: number | string | null;
  discount_percent: number | string | null;
  stock_total: number | string | null;
  variant_count: number | string | null;
  cover_url: string | null;
};

/** web_listings: one row per colour/storage product on a page. */
export type ListingRow = {
  product_id: string | number;
  slug: string;
  family_slug: string;
  page_title: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  storage: string | null;
  colour: string | null;
  category: string | null;
  description: string | null;
  /** Grouped for display: { "Display": { "Screen size": "6.9 inch" } }. May be empty. */
  specs?: Record<string, Record<string, string>> | null;
  is_phone: boolean;
  discount_percent: number | string | null;
  price_from: number | string | null;
  price_to: number | string | null;
  stock_total: number | string | null;
  cover_url: string | null;
};

/** web_variants: one sellable variant (what a customer buys). */
export type VariantRow = {
  product_id: string | number;
  condition: string | null;
  pta_status: string | null;
  device_type: string | null;
  price: number | string;
  compare_price: number | string | null;
  quantity: number | string;
  grade: string | null;
  battery_health: number | string | null;
  warranty_days: number | string | null;
};

/** web_images: one photo. A null variant_product_id means the photo belongs to the whole page. */
export type ImageRow = {
  image_id: string | number;
  family_slug: string;
  variant_product_id: string | number | null;
  product_id: string | number | null;
  url: string;
  alt: string | null;
  position: number | string | null;
};

/** web_variant_stock: the same variants split by shop. */
export type VariantStockRow = {
  product_id: string | number;
  condition: string | null;
  pta_status: string | null;
  device_type: string | null;
  price: number | string;
  shop_id: string | number;
  shop_name: string | null;
  quantity: number | string;
};

export type Catalogue = {
  families: FamilyRow[];
  listings: ListingRow[];
  variants: VariantRow[];
  images: ImageRow[];
  stock: VariantStockRow[];
  /** True when the ERP could not be read: show a friendly notice, not an empty shop. */
  unavailable?: boolean;
};

/** What a cart line needs to be sent to the ERP: exactly the variant's identity, copied from its web_variants row. */
export type ErpLine = {
  productId: string;
  condition: string | null;
  pta: string | null;
  type: string | null;
  price: number;
  quantity: number;
};
