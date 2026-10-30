import type { Metadata } from "next";
import { Suspense } from "react";
import { createProductAction } from "@/app/actions/admin-catalog";
import { ProductBasicsFields } from "@/components/admin/product-basics-fields";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { getCatalogOptions } from "@/lib/admin-products";

export const metadata: Metadata = { title: "New product · Admin", robots: { index: false } };

export default function NewProductPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: "New product" }]} />
      <div className="mt-4">
        <PageHeader
          title="New product"
          description="Start with the basics. You'll add photos, specifications and options (storage, color…) next."
        />
      </div>
      <Suspense fallback={<div className="h-96 max-w-3xl animate-pulse rounded-2xl bg-background" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  await requireAdmin("/admin/products/new");
  const options = await getCatalogOptions();
  return (
    <ActionForm action={createProductAction} className="max-w-3xl space-y-5 rounded-2xl border bg-background p-5">
      <ProductBasicsFields {...options} />
      <Button type="submit">Create product</Button>
    </ActionForm>
  );
}
