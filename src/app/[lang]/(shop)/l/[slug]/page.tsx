import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ListingSkeleton, ListingView } from "@/components/listing/listing-view";
import { categoryLabel, getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { getCategory, getFacets, getListing } from "@/lib/catalog";
import { parseListingParams } from "@/lib/listing-params";
import { site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/l/[slug]">): Promise<Metadata> {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const category = await getCategory(slug);
  if (!category) return {};
  const t = getDict(lang);
  const name = categoryLabel(t, category.slug, category.name);
  return {
    title: t.listing.title(name),
    description: t.listing.description(name, site.warrantyMonths),
    alternates: alternatesFor(`/l/${slug}`, lang),
  };
}

export default function CategoryPage(props: PageProps<"/[lang]/l/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CategoryListing {...props} />
    </Suspense>
  );
}

async function CategoryListing({ params, searchParams }: PageProps<"/[lang]/l/[slug]">) {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const category = await getCategory(slug);
  if (!category) notFound();
  const t = getDict(lang);
  const name = categoryLabel(t, category.slug, category.name);

  const raw = await searchParams;
  const filters = parseListingParams(raw, { category: slug });
  const [listing, facets] = await Promise.all([getListing(filters), getFacets(slug)]);

  return (
    <ListingView
      lang={lang}
      pathname={`/l/${slug}`}
      params={raw}
      filters={filters}
      facets={facets}
      listing={listing}
      title={t.listing.title(name)}
      description={lang === "en" && category.description ? category.description : t.listing.description(name, site.warrantyMonths)}
      breadcrumbs={[
        { label: t.common.home, href: "/" },
        { label: name },
      ]}
      subcategories={category.children}
    />
  );
}
