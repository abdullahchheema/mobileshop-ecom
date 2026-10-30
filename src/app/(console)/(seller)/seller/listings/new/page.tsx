import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/console/console-shell";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { NewListingForm } from "@/components/seller/new-listing-form";
import { getListableProducts } from "@/lib/seller-listings";
import { requireSeller } from "@/lib/sellers";

export const metadata: Metadata = { title: "Add a listing · Seller hub", robots: { index: false } };

export default function NewListingPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Listings", href: "/seller/listings" }, { label: "Add a listing" }]} />
      <div className="mt-4">
        <PageHeader title="Add a listing" description="Pick a model from our catalog, describe the exact device, set your price." />
      </div>
      <Suspense fallback={<div className="h-40 max-w-3xl animate-pulse rounded-2xl bg-background" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireSeller("/seller/listings/new");
  const products = await getListableProducts();
  return <NewListingForm products={products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name }))} />;
}
