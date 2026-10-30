import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC-SHA512 of the raw request body, hex encoded (Safepay's webhook signature scheme). */
export const hmacSha512Hex = (secret: string, body: string) => createHmac("sha512", secret).update(body).digest("hex");

/**
 * Checks a webhook signature against the raw body. Constant-time comparison so a
 * forged signature can't be discovered byte by byte. `secrets` allows a previous
 * key to keep working while a rotated one propagates.
 */
export function verifySignature(body: string, signature: string | null, secrets: (string | undefined)[]) {
  if (!signature) return false;
  const received = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return secrets.some((secret) => {
    if (!secret) return false;
    const expected = Buffer.from(hmacSha512Hex(secret, body), "utf8");
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}
