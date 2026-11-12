import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { apiError } from "@/lib/http";

const digest = (v: string) => createHash("sha256").update(v).digest();

/**
 * The ERP calls this the moment stock, a price, a photo or an order changes ("look again"). It carries no data: it only drops the cached
 * catalogue so the next visitor sees the change at once. Same shared secret as the order API. If this call is ever missed the cache expires
 * by itself within a minute, so nothing can stay wrong.
 */
export async function POST(request: Request) {
  const key = process.env.ERP_API_KEY;
  if (!key) return apiError(503, "UNAVAILABLE", "Not configured.");
  const sent = request.headers.get("x-api-key") ?? "";
  if (!timingSafeEqual(digest(sent), digest(key))) return apiError(401, "UNAUTHORIZED", "Invalid key.");
  revalidateTag("catalogue", { expire: 0 });
  return Response.json({ ok: true });
}
