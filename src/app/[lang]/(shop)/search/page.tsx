import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton, ListingView } from "@/components/listing/listing-view";
import { getDict, langOf } from "@/i18n";
import { getFacets, getListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing-params";

export async function generateMetadata({ params }: PageProps<"/[lang]/search">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).listing.search, robots: { index: false } };
}

export default function SearchPage(props: PageProps<"/[lang]/search">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <SearchResults {...props} />
    </Suspense>
  );
}

async function SearchResults({ params, searchParams }: PageProps<"/[lang]/search">) {
  const [lang, raw] = await Promise.all([langOf(params), searchParams]);
  const t = getDict(lang);
  const filters = parseListingParams(raw);
  const [listing, facets] = await Promise.all([getListing(filters), getFacets()]);

  return (
    <ListingView
      lang={lang}
      pathname="/search"
      params={raw}
      filters={filters}
      facets={facets}
      listing={listing}
      title={filters.q ? t.listing.searchTitle(filters.q) : t.listing.searchAll}
      breadcrumbs={[{ label: t.common.home, href: "/" }, { label: t.listing.search }]}
    />
  );
}
