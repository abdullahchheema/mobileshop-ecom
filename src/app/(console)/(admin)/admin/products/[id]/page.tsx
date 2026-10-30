import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheckBigIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import {
  addOptionAction,
  addOptionValueAction,
  removeOptionAction,
  removeOptionValueAction,
  updateProductAction,
} from "@/app/actions/admin-catalog";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductBasicsFields } from "@/components/admin/product-basics-fields";
import { SpecsEditor } from "@/components/admin/specs-editor";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { getAdminProduct, getCatalogOptions, OPTION_TYPES } from "@/lib/admin-products";

export const metadata: Metadata = { title: "Edit product · Admin", robots: { index: false } };

const input = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireAdmin(`/admin/products/${id}`);
  const [product, options] = await Promise.all([getAdminProduct(id), getCatalogOptions()]);
  if (!product) notFound();
  const locked = product._count.variants > 0;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Products", href: "/admin/products" }, { label: product.name }]} />
      <PageHeader
        title={product.name}
        description={`${product.brand.name} · ${product.category.name} · ${product._count.offers} seller offers`}
        actions={
          <Button asChild variant="outline">
            <Link href={`/p/${product.slug}`} target="_blank">
              View in store <ExternalLinkIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />

      {query.created === "1" && (
        <p className="flex items-center gap-2 rounded-2xl bg-mint p-4 text-sm font-medium">
          <CircleCheckBigIcon className="size-5 text-primary" />
          Product created with the standard condition grades. Add its options (storage, color…) below so sellers can list it.
        </p>
      )}

      <Section title="Basics">
        <ActionForm action={updateProductAction} className="space-y-4">
          <input type="hidden" name="id" value={product.id} />
          <ProductBasicsFields {...options} product={product} />
          <Button type="submit">Save basics</Button>
        </ActionForm>
      </Section>

      <Section title="Photos">
        <ImageManager productId={product.id} images={product.images} />
      </Section>

      <Section title="Specifications">
        <SpecsEditor productId={product.id} specs={(product.specs ?? {}) as Record<string, string>} />
      </Section>

      <Section
        title="Options sellers choose from"
        description={
          locked
            ? "Sellers already list this product, so options are fixed. You can still add new values (a new color, say)."
            : "These become the pickers on the product page. Add every option before sellers start listing."
        }
      >
        <div className="space-y-4">
          {product.options.map((option) => (
            <div key={option.id} className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {option.name} <span className="text-xs font-normal text-muted-foreground">({option.type.toLowerCase()})</span>
                </p>
                {!locked && option.type !== "CONDITION" && (
                  <ActionForm action={removeOptionAction} confirm={`Remove the ${option.name} option?`}>
                    <input type="hidden" name="optionId" value={option.id} />
                    <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                      Remove option
                    </Button>
                  </ActionForm>
                )}
              </div>
              <ul className="flex flex-wrap gap-2">
                {option.values.map((value) => (
                  <li key={value.id} className="flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-3 text-sm">
                    {value.colorHex && (
                      <span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: value.colorHex }} />
                    )}
                    {value.label}
                    {value._count.variants > 0 ? (
                      <span className="px-1.5 text-xs text-muted-foreground" title="Sellers list this value">
                        in use
                      </span>
                    ) : (
                      <ActionForm action={removeOptionValueAction} confirm={`Remove "${value.label}"?`}>
                        <input type="hidden" name="valueId" value={value.id} />
                        <button type="submit" aria-label={`Remove ${value.label}`} className="rounded-full p-1 hover:bg-secondary">
                          <XIcon className="size-3.5" />
                        </button>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
              {option.type !== "CONDITION" && (
                <ActionForm action={addOptionValueAction} resetOnSuccess className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="optionId" value={option.id} />
                  <input
                    name="label"
                    required
                    placeholder={option.type === "STORAGE" ? "e.g. 1 TB" : option.type === "COLOR" ? "e.g. Midnight" : "New value"}
                    className={`${input} w-40`}
                  />
                  {option.type === "COLOR" && (
                    <input name="colorHex" type="color" defaultValue="#888888" aria-label="Swatch color" className="h-9 w-12 rounded-lg border" />
                  )}
                  <Button type="submit" variant="outline" size="sm">
                    Add value
                  </Button>
                </ActionForm>
              )}
            </div>
          ))}

          {!locked && (
            <ActionForm action={addOptionAction} resetOnSuccess className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed p-4">
              <input type="hidden" name="productId" value={product.id} />
              <label className="grid gap-1 text-xs font-medium">
                Option type
                <select name="type" className={input} defaultValue="STORAGE">
                  {OPTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Shown as
                <input name="name" required placeholder="e.g. Storage" className={`${input} w-40`} />
              </label>
              <Button type="submit" variant="outline">
                Add option
              </Button>
            </ActionForm>
          )}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-background p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
