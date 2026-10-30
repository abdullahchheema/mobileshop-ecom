import { z } from "zod";
import { PROVINCES } from "@/lib/pakistan";
import { normalizePkMobile } from "@/lib/phone";

const provinceValues = PROVINCES.map((p) => p.value) as [string, ...string[]];

/** Delivery address. Used by the web forms and the /api/v1 endpoints. */
export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's full name").max(80),
  phone: z
    .string()
    .transform((v, ctx) => {
      const phone = normalizePkMobile(v);
      if (!phone) ctx.addIssue({ code: "custom", message: "Enter a valid Pakistani mobile number" });
      return phone ?? "";
    }),
  line1: z.string().trim().min(5, "Enter house number, street and area").max(200),
  line2: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || undefined),
  city: z.string().trim().min(2, "Enter a city").max(60),
  province: z.enum(provinceValues, { message: "Choose a province" }),
  postalCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => !v || /^\d{5}$/.test(v), "Postal codes are 5 digits"),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

/** 13-digit CNIC, stored as 12345-1234567-1. */
export const cnicSchema = z.string().transform((v, ctx) => {
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 13) {
    ctx.addIssue({ code: "custom", message: "Enter your 13-digit CNIC, e.g. 35202-1234567-1" });
    return "";
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
});

/** Pakistani IBAN: PK, 2 check digits, 4-letter bank code, 16 digits (24 characters). */
export const ibanSchema = z.string().transform((v, ctx) => {
  const iban = v.replace(/\s/g, "").toUpperCase();
  if (!/^PK\d{2}[A-Z]{4}\d{16}$/.test(iban)) {
    ctx.addIssue({ code: "custom", message: "Enter a 24-character Pakistani IBAN, e.g. PK36SCBL0000001123456702" });
  }
  return iban;
});

export const sellerApplicationSchema = z.object({
  shopName: z.string().trim().min(3, "Shop name must be at least 3 characters").max(60),
  city: z.string().trim().min(2, "Enter your city").max(60),
  phone: addressSchema.shape.phone,
  cnic: cnicSchema,
  ntn: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
  bankName: z.string().trim().min(2, "Enter your bank").max(60),
  accountTitle: z.string().trim().min(2, "Enter the account title").max(80),
  iban: ibanSchema,
  agree: z.literal(true, { message: "Please accept the seller quality standards" }),
});

export type SellerApplication = z.infer<typeof sellerApplicationSchema>;

/** One listing (offer) as a seller edits it. */
export const offerFieldsSchema = z.object({
  price: z.number().int().min(1000, "Price must be at least Rs 1,000").max(5_000_000),
  stock: z.number().int().min(0).max(999),
  warrantyMonths: z.number().int().min(12, "Warranty must be at least 12 months").max(36),
});

export const placeOrderSchema = z.object({
  addressId: z.string().min(1, "Choose a delivery address"),
  paymentMethod: z.enum(["COD", "CARD", "JAZZCASH", "EASYPAISA"]),
  /** The total the buyer saw, so we never charge a price they didn't confirm. */
  expectedTotal: z.number().int().nonnegative(),
});
