// The numbers behind the policy pages (help, shipping, returns, warranty, terms). One place to change them; the pages and the FAQ
// read from here. Warranty months, return days and the inspection count live in site.ts because the product pages promise them too.
//
// These are business decisions, not facts about the software: the owner should check each one matches how the shop really works
// before the pages are published (see docs/content-notes.md).

export const policy = {
  /** Working days a courier usually needs once the order is confirmed. */
  deliveryMinDays: 2,
  deliveryMaxDays: 5,
  /** Working days to send a refund once the returned phone has reached the shop and passed the check. */
  refundWorkingDays: 7,
  /** The date the policy pages and journal were last reviewed (ISO). Shown on the legal pages. */
  reviewed: "2026-11-13",
} as const;
