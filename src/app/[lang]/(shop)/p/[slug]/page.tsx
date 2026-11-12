import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { ProductDetails } from "@/components/product/product-details";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductRail } from "@/components/product/product-rail";
import { categoryLabel, type Dict, getDict, langOf } from "@/i18n";
import { type Lang, localizePath } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getProductPage, getProductRail, type ProductPageData } from "@/lib/catalog";
import { priceSummary, selectionFromParams } from "@/lib/pricing";
import { formatPkr, site } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/p/[slug]">): Promise<Metadata> {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const product = await getProductPage(slug);
  if (!product) return {};
  const t = getDict(lang);
  const prices = priceSummary(product.variants);
  return {
    title: `${product.name} ${t.product.titleSuffix}${prices ? ` ${t.common.fromPrice(formatPkr(prices.min))}` : ""}`,
    description: t.product.metaDescription(product.name, site.warrantyMonths, site.returnDays),
    alternates: alternatesFor(`/p/${slug}`, lang),
  };
}

export default function ProductPage(props: PageProps<"/[lang]/p/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params, searchParams }: PageProps<"/[lang]/p/[slug]">) {
  const [lang, { slug }] = await Promise.all([langOf(params), params]);
  const t = getDict(lang);
  const product = await getProductPage(slug);
  if (!product) notFound();

  const [query, similar] = await Promise.all([
    searchParams,
    getProductRail({ category: product.category.slug, sort: "popular", limit: 8, excludeSlug: slug }),
  ]);
  const initialSelection = selectionFromParams(product.pickers, product.variants, query);
  const parent = product.category.parent;
  const crumbs = [
    { label: t.common.home, href: "/" },
    ...(parent ? [{ label: categoryLabel(t, parent.slug, parent.name), href: `/l/${parent.slug}` }] : []),
    { label: categoryLabel(t, product.category.slug, product.category.name), href: `/l/${product.category.slug}` },
    { label: product.name },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-6">
      <JsonLd product={product} lang={lang} t={t} crumbs={crumbs} />
      <div className="space-y-6">
        <Breadcrumbs items={crumbs} />
        <ProductPurchase
          name={product.name}
          brand={product.brand.name}
          releaseYear={product.releaseYear}
          kind={product.kind}
          images={product.images}
          imagesByProduct={product.imagesByProduct}
          newPrice={product.newPrice}
          pickers={product.pickers}
          variants={product.variants}
          initialSelection={initialSelection}
        />
      </div>
      <ProductDetails product={product} lang={lang} />
      <ProductRail
        lang={lang}
        title={t.product.more(categoryLabel(t, product.category.slug, product.category.name))}
        products={similar}
        href={`/l/${product.category.slug}`}
      />
    </div>
  );
}

/** schema.org Product and BreadcrumbList data so search engines can show price ranges and the trail. */
function JsonLd({
  product,
  lang,
  t,
  crumbs,
}: {
  product: ProductPageData;
  lang: Lang;
  t: Dict;
  crumbs: { label: string; href?: string }[];
}) {
  const prices = priceSummary(product.variants);
  const url = (path: string) => `${site.url}${localizePath(path, lang)}`;
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${t.product.titleSuffix}`,
    brand: { "@type": "Brand", name: product.brand.name },
    description: product.description,
    url: url(`/p/${product.slug}`),
    ...(product.images[0] && { image: product.images.map(({ url: src }) => (src.startsWith("http") ? src : `${site.url}${src}`)) }),
    ...(prices && {
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "PKR",
        lowPrice: prices.min,
        highPrice: prices.max,
        offerCount: prices.offerCount,
        itemCondition: "https://schema.org/RefurbishedCondition",
        availability: "https://schema.org/InStock",
      },
    }),
  };
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: url(c.href ?? `/p/${product.slug}`),
    })),
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here once "<" is escaped.
      dangerouslySetInnerHTML={{ __html: JSON.stringify([productData, breadcrumbData]).replace(/</g, "\\u003c") }}
    />
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-6 lg:grid-cols-2" aria-busy="true">
      <div className="aspect-square animate-pulse rounded-3xl bg-secondary" />
      <div className="space-y-4">
        <div className="h-10 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-12 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-12 animate-pulse rounded-full bg-secondary" />
        <div className="h-64 animate-pulse rounded-2xl bg-secondary" />
      </div>
    </div>
  );
}
