/**
 * Normalizes a Pakistani mobile number to E.164 (+923XXXXXXXXX).
 * Accepts 03001234567, 3001234567, 923001234567, +92 300 1234567, etc.
 * Returns null when the input is not a valid PK mobile number.
 */
export function normalizePkMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(4);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^3\d{9}$/.test(digits) ? `+92${digits}` : null;
}

export const isPkMobile = (phone: string) => /^\+923\d{9}$/.test(phone);
