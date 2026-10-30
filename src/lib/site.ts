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

export const formatPkr = (amount: number) => `Rs ${amount.toLocaleString("en-PK")}`;
