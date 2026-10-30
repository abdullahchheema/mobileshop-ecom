"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import { DeviceArt } from "@/components/product/device-art";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

type Suggestion = { slug: string; name: string; brand: string; kind: string; fromPrice: number };

/**
 * GET form (so search works without JavaScript) with search-as-you-type
 * suggestions and keyboard navigation layered on top.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const { t, href } = useI18n();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search/suggest?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const { data } = (await res.json()) as { data: Suggestion[] };
        setResults(data);
        setActive(-1);
      } catch {
        // Aborted by a newer keystroke, or offline: keep the previous list.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const visible = open && query.trim().length >= 2 && results.length > 0;

  function go(slug: string) {
    setOpen(false);
    router.push(href(`/p/${slug}`));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(results[active].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <form ref={root} action={href("/search")} role="search" className={cn("relative", className)} onSubmit={() => setOpen(false)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 start-4 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t.header.searchPlaceholder}
        aria-label={t.header.searchLabel}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        className="h-10 w-full rounded-lg border border-transparent bg-secondary pe-4 ps-11 text-sm outline-none transition placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30"
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border bg-popover py-1 shadow-xl"
        >
          {results.map((r, i) => (
            <li
              key={r.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => go(r.slug)}
              onMouseEnter={() => setActive(i)}
              className={cn("flex cursor-pointer items-center gap-3 px-3 py-2", i === active && "bg-secondary")}
            >
              <span className="size-10 shrink-0 rounded-lg bg-secondary p-1">
                <DeviceArt kind={r.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}</span>
                <span className="block text-xs text-muted-foreground">{r.brand}</span>
              </span>
              <span className="text-xs font-semibold">{t.common.fromPrice(formatPkr(r.fromPrice))}</span>
            </li>
          ))}
          <li className="border-t px-3 py-2 text-sm">
            <button type="submit" className="font-semibold text-primary hover:underline">
              {t.header.seeAllResults(query.trim())}
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
