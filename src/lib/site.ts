// Store-wide constants shown across the UI. Keep promises here so they stay consistent.
export const site = {
  name: "Trendz Mobile",
  tagline: "Refurbished phones and tech, checked by experts.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  warrantyMonths: 12,
  returnDays: 15,
  inspectionPoints: 70,
  // Placeholders until the business has real contact details.
  supportPhone: "+92 300 0000000",
  supportEmail: "support@example.com",
} as const;

/** Whole rupees, with decimals only when the price has them, and then always two (Rs 269,997.30, never Rs 269,997.3). */
export const formatPkr = (amount: number) => {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `Rs ${amount.toLocaleString("en-PK", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};
