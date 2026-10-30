import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CartError } from "@/lib/cart";
import { CheckoutError } from "@/lib/orders";

// Helpers for the /api/v1 route handlers used by the mobile app. Requests
// authenticate with `Authorization: Bearer <token>` (or the web session cookie).

export const apiError = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

/** Signed-in user id, or a 401 Response to return as-is. */
export async function requireApiUser(request: Request): Promise<string | Response> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session ? session.user.id : apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
}

export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T> | Response> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, "INVALID", parsed.error.issues[0]?.message ?? "Invalid request body.");
  return parsed.data;
}

const CHECKOUT_STATUS: Partial<Record<CheckoutError["code"], number>> = {
  NOT_FOUND: 404,
  ADDRESS_NOT_FOUND: 404,
  PRICE_CHANGED: 409,
  OUT_OF_STOCK: 409,
  ITEMS_UNAVAILABLE: 409,
};

/** Maps domain errors to JSON responses; anything else is rethrown as a 500. */
export function handleDomainError(e: unknown) {
  if (e instanceof CartError) return apiError(e.code === "NOT_FOUND" ? 404 : 409, e.code, e.message);
  if (e instanceof CheckoutError) return apiError(CHECKOUT_STATUS[e.code] ?? 400, e.code, e.message);
  throw e;
}
