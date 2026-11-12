"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const EVENT = "catalogue-changed";
const INTERVAL = 15_000;

/**
 * Keeps an open page honest without a manual refresh: every few seconds (only while the tab is visible) it asks for the catalogue's
 * fingerprint and, when stock, a price or a page changed, refreshes the page's data in place (what the customer picked is kept).
 * The cart listens for the same signal and re-prices itself.
 */
export function LiveRefresh() {
  const router = useRouter();
  const last = useRef<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      if (stopped || document.hidden) return;
      try {
        const response = await fetch("/api/catalog-version", { cache: "no-store" });
        if (!response.ok) return;
        const { version } = (await response.json()) as { version: string };
        if (last.current !== null && version !== last.current) {
          router.refresh();
          window.dispatchEvent(new Event(EVENT));
        }
        last.current = version;
      } catch {
        // offline or restarting: try again on the next tick
      }
    }
    void poll();
    const timer = window.setInterval(poll, INTERVAL);
    const onVisible = () => !document.hidden && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
