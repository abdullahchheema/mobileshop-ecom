"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { CartView } from "@/lib/cart";
import { useCartItems } from "@/lib/cart-store";

type State = { cart: CartView | null; loading: boolean; failed: boolean };

const noopSubscribe = () => () => {};
/** False while the page is hydrating (the browser cart cannot be read yet), true once it can. */
const useHydrated = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/** The browser cart priced from the ERP's current data (the browser stores only variant keys and quantities). */
export function useCartView() {
  const items = useCartItems();
  const hydrated = useHydrated();
  const signature = JSON.stringify(items);
  const [state, setState] = useState<State>({ cart: null, loading: true, failed: false });

  const load = useCallback(async (signal?: AbortSignal) => {
    const wanted = JSON.parse(signature) as typeof items;
    if (wanted.length === 0) {
      setState({ cart: { lines: [], itemCount: 0, hasUnavailable: false, totals: { subtotal: 0, shipping: 0, total: 0 } }, loading: false, failed: false });
      return null;
    }
    try {
      const response = await fetch("/api/cart/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: wanted }),
        signal,
      });
      if (!response.ok) throw new Error(String(response.status));
      const { cart } = (await response.json()) as { cart: CartView };
      setState({ cart, loading: false, failed: false });
      return cart;
    } catch (e) {
      if ((e as Error).name !== "AbortError") setState((s) => ({ ...s, loading: false, failed: true }));
      return null;
    }
  }, [signature]);

  useEffect(() => {
    // Until hydration finishes the cart reads as empty: loading it then would wrongly look like "nothing to buy".
    if (!hydrated) return;
    const controller = new AbortController();
    // Fetching on mount and whenever the cart changes: the state updates happen after the async request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(controller.signal);
    return () => controller.abort();
  }, [load, hydrated]);

  return { ...state, items, reload: () => load() };
}
