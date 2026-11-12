import { createHmac, timingSafeEqual } from "node:crypto";

// The ERP's tracking endpoint does not check who is asking, so the website does. Our order number carries a short
// check code derived from the customer's phone with a server-only secret (the ERP key). Showing an order needs the
// number AND the phone it was placed with; nothing is stored on the website.
//   TM-<12 chars>-<6 char check>

const secret = () => {
  const key = process.env.ERP_API_KEY;
  if (!key) throw new Error("ERP_API_KEY is not set");
  return key;
};

const digits = (phone: string) => phone.replace(/\D/g, "").slice(-10); // 0300 1234567, +92 300 1234567 -> 3001234567

const check = (id: string, phone: string) =>
  createHmac("sha256", secret()).update(`${id}:${digits(phone)}`).digest("base64url").replace(/[-_]/g, "").slice(0, 6).toUpperCase();

export const makeOrderRef = (id: string, phone: string) => {
  const clean = id.toUpperCase();
  return `TM-${clean}-${check(clean, phone)}`;
};

/** True only when `ref` was issued for this phone number. */
export function refMatchesPhone(ref: string, phone: string) {
  const m = /^TM-([A-Z0-9]{8,24})-([A-Z0-9]{6})$/i.exec(ref.trim());
  if (!m || digits(phone).length < 10) return false;
  const expected = Buffer.from(check(m[1].toUpperCase(), phone));
  const given = Buffer.from(m[2].toUpperCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}
