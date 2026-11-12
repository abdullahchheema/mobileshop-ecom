/** One row of the ERP's `online_stock` view: phones ready to sell online, grouped by model, condition and PTA status. */
export type OnlineStockRow = {
  product_code: string;
  product_name: string;
  condition: string | null;
  pta_status: string | null;
  /** Lowest asking price in the group (numeric: pg returns it as a string). */
  price: string | number;
  /** Count of phones (bigint: pg returns it as a string). */
  stock: string | number;
  warranty_days: string | number | null;
};

/**
 * Turns view rows into the same items the ERP used to POST, so the existing validation
 * and offer rebuild (`applySnapshot`) apply unchanged. `warrantyOverrideDays` is the shop's
 * online warranty promise: counter purchases do not record warranty days.
 */
export function rowsToSnapshotItems(rows: OnlineStockRow[], warrantyOverrideDays?: number | null) {
  return rows.map((row) => ({
    productCode: row.product_code,
    productName: row.product_name,
    condition: row.condition ?? "",
    pta: row.pta_status ?? "",
    price: row.price,
    stock: row.stock,
    warrantyDays: warrantyOverrideDays ?? row.warranty_days ?? 0,
  }));
}
