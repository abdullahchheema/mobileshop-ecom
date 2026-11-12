"use client";

import { useEffect, useState } from "react";
import { DEFAULT_STORE_CONFIG, type StoreConfig } from "@/lib/store-config";

let loaded: StoreConfig | null = null;
let pending: Promise<StoreConfig> | null = null;

function load(force = false) {
  if (!force && loaded) return Promise.resolve(loaded);
  if (!force && pending) return pending;
  pending = fetch("/api/store-config", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<StoreConfig>) : DEFAULT_STORE_CONFIG))
    .catch(() => DEFAULT_STORE_CONFIG)
    .then((c) => (loaded = c));
  return pending;
}

/** The store's delivery pricing and payment accounts (from the ERP). Starts with the usual numbers, then updates; refreshes when the catalogue changes. */
export function useStoreConfig() {
  const [config, setConfig] = useState<StoreConfig>(loaded ?? DEFAULT_STORE_CONFIG);
  useEffect(() => {
    let alive = true;
    void load().then((c) => alive && setConfig(c));
    const again = () => void load(true).then((c) => alive && setConfig(c));
    window.addEventListener("catalogue-changed", again);
    return () => {
      alive = false;
      window.removeEventListener("catalogue-changed", again);
    };
  }, []);
  return config;
}
