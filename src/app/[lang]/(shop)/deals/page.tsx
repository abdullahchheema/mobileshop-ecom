import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton, ListingView } from "@/components/listing/listing-view";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { getFacets, getListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing-params";

export async function generateMetadata({ params }: PageProps<"/[lang]/deals">): Promise<Metadata> {
  const lang = await langOf(params);
  const t = getDict(lang);
  return { title: t.listing.dealsTitle, description: t.listing.dealsText, alternates: alternatesFor("/deals", lang) };
}

export default function DealsPage(props: PageProps<"/[lang]/deals">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <Deals {...props} />
    </Suspense>
  );
}

async function Deals({ params, searchParams }: PageProps<"/[lang]/deals">) {
  const [lang, raw] = await Promise.all([langOf(params), searchParams]);
  const t = getDict(lang);
  const filters = parseListingParams(raw, { sort: "savings" });
  const [listing, facets] = await Promise.all([getListing(filters), getFacets()]);

  return (
    <ListingView
      lang={lang}
      pathname="/deals"
      params={raw}
      filters={filters}
      facets={facets}
      listing={listing}
      title={t.listing.dealsTitle}
      description={t.listing.dealsText}
      breadcrumbs={[{ label: t.common.home, href: "/" }, { label: t.listing.dealsTitle }]}
    />
  );
}
