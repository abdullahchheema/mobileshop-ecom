"use client";

import { useSyncExternalStore } from "react";
import { type CartItem, clampQuantity, MAX_LINES } from "@/lib/cart";

// The cart lives in this browser only (localStorage): the storefront has no database and no customer accounts.
// It stores variant keys and quantities, never prices, so a stale cart can never carry a stale price.

const STORAGE_KEY = "trendz-cart-v1";
const EVENT = "trendz-cart-changed";
const EMPTY: CartItem[] = [];

let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY; // storage blocked (private mode): the cart just doesn't persist
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed)
      ? parsed.flatMap((i) => (i && typeof i.key === "string" && typeof i.qty === "number" ? [{ key: i.key, qty: clampQuantity(i.qty) }] : []))
      : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function write(items: CartItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore: see read()
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export const useCartItems = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const useCartCount = () => {
  const items = useCartItems();
  return items.reduce((n, i) => n + i.qty, 0);
};

/** Adds one variant. `max` is how many the ERP has in stock. Returns true when the quantity was capped. */
export function addToCart(key: string, qty = 1, max = Infinity) {
  const items = [...read()];
  const found = items.find((i) => i.key === key);
  const wanted = (found?.qty ?? 0) + qty;
  const next = Math.min(clampQuantity(wanted), Math.max(1, max));
  if (found) found.qty = next;
  else if (items.length < MAX_LINES) items.push({ key, qty: next });
  write(items);
  return next < wanted;
}

export function setQuantity(key: string, qty: number) {
  write(read().map((i) => (i.key === key ? { key, qty: clampQuantity(qty) } : i)));
}

export function removeLine(key: string) {
  write(read().filter((i) => i.key !== key));
}

export function clearCart() {
  write([]);
}

// ─── Recent orders (so "My orders" works without accounts) ──────────────────────────────────────────────────
const ORDERS_KEY = "trendz-orders-v1";
export type RecentOrder = { ref: string; total: number; placedAt: string };

export function rememberOrder(order: RecentOrder) {
  try {
    const all: RecentOrder[] = JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "[]");
    window.localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...all.filter((o) => o.ref !== order.ref)].slice(0, 30)));
  } catch {
    // ignore
  }
}

export function recentOrders(): RecentOrder[] {
  try {
    const all = JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? "[]");
    return Array.isArray(all) ? all : [];
  } catch {
    return [];
  }
}
