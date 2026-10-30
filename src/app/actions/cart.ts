"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { addToCart, CartError, removeFromCart, setQuantity } from "@/lib/cart";
import { currentCartOwner, ensureCartOwner } from "@/lib/cart-owner";

export type CartActionResult = { ok: true; capped?: boolean } | { ok: false; error: string };

const id = z.string().min(1).max(64);

async function run(fn: () => Promise<{ capped?: boolean } | void>): Promise<CartActionResult> {
  try {
    const result = await fn();
    refresh();
    return { ok: true, ...(result ?? {}) };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function addToCartAction(offerId: string) {
  const parsed = id.safeParse(offerId);
  if (!parsed.success) return { ok: false, error: "Invalid item." } satisfies CartActionResult;
  return run(async () => {
    const { capped } = await addToCart(await ensureCartOwner(), parsed.data);
    return { capped };
  });
}

export async function updateQuantityAction(itemId: string, quantity: number) {
  const parsed = z.object({ itemId: id, quantity: z.number().int().min(0).max(99) }).safeParse({ itemId, quantity });
  if (!parsed.success) return { ok: false, error: "Invalid quantity." } satisfies CartActionResult;
  return run(async () => {
    const owner = await currentCartOwner();
    if (!owner) throw new CartError("NOT_FOUND", "Your cart is empty.");
    await setQuantity(owner, parsed.data.itemId, parsed.data.quantity);
  });
}

export async function removeFromCartAction(itemId: string) {
  const parsed = id.safeParse(itemId);
  if (!parsed.success) return { ok: false, error: "Invalid item." } satisfies CartActionResult;
  return run(async () => {
    const owner = await currentCartOwner();
    if (owner) await removeFromCart(owner, parsed.data);
  });
}
