import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CircleCheckBigIcon, PlusIcon, SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/console/console-shell";
import { ListingsTable } from "@/components/seller/listings-table";
import { Button } from "@/components/ui/button";
import { LISTING_FILTERS, type ListingFilter, listSellerOffers } from "@/lib/seller-listings";
import { requireSeller } from "@/lib/sellers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Listings · Seller hub", robots: { index: false } };

export default function ListingsPage(props: PageProps<"/seller/listings">) {
  return (
    <>
      <PageHeader
        title="Listings"
        description="Edit prices and stock, then save. Paused and sold-out listings are hidden from buyers."
        actions={
          <Button asChild>
            <Link href="/seller/listings/new">
              <PlusIcon data-icon="inline-start" /> Add a listing
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Listings {...props} />
      </Suspense>
    </>
  );
}

async function Listings({ searchParams }: PageProps<"/seller/listings">) {
  const { seller } = await requireSeller("/seller/listings");
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = one(params.q)?.trim() || undefined;
  const filter = (LISTING_FILTERS.find((f) => f.key === one(params.filter))?.key ?? "all") as ListingFilter;
  const page = Math.max(1, Number.parseInt(one(params.page) ?? "1", 10) || 1);

  const { rows, total, pageCount } = await listSellerOffers(seller.id, { q, filter, page });
  const href = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams({ ...(q && { q }), ...(filter !== "all" && { filter }) });
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    return `/seller/listings${next.size ? `?${next}` : ""}`;
  };

  return (
    <div className="space-y-4">
      {one(params.created) === "1" && (
        <p className="flex items-center gap-2 rounded-2xl bg-mint p-4 text-sm font-medium">
          <CircleCheckBigIcon className="size-5 text-primary" /> Your listing is live. Buyers can see it now.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action="/seller/listings" className="relative min-w-60 flex-1">
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search your listings, e.g. iPhone 14"
            className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm"
          />
        </form>
        <nav className="flex gap-1 rounded-xl bg-background p-1" aria-label="Filter listings">
          {LISTING_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href({ filter: f.key === "all" ? null : f.key, page: null })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                f.key === filter ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? "listing" : "listings"}
        {pageCount > 1 && ` · page ${page} of ${pageCount}`}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-background p-12 text-center">
          <p className="font-semibold">No listings match</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/seller/listings/new">Add a listing</Link>
          </Button>
        </div>
      ) : (
        // Remount on page/filter change so unsaved edits never apply to other rows.
        <ListingsTable key={`${q}-${filter}-${page}`} rows={rows} />
      )}

      {pageCount > 1 && (
        <nav className="flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={href({ page: String(page - 1) })}>Previous</Link>
            </Button>
          )}
          {page < pageCount && (
            <Button asChild variant="outline">
              <Link href={href({ page: String(page + 1) })}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
