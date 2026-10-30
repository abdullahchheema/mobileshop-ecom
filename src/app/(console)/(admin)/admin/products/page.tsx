import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlusIcon, SearchIcon } from "lucide-react";
import { PageHeader } from "@/components/console/console-shell";
import { DeviceArt } from "@/components/product/device-art";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { listAdminProducts } from "@/lib/admin-products";

export const metadata: Metadata = { title: "Products · Admin", robots: { index: false } };

export default function AdminProductsPage(props: PageProps<"/admin/products">) {
  return (
    <>
      <PageHeader
        title="Products"
        description="The catalog sellers list against. One product per model; sellers add the condition, storage and color."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <PlusIcon data-icon="inline-start" /> New product
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Products {...props} />
      </Suspense>
    </>
  );
}

async function Products({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin("/admin/products");
  const { q: rawQ, page: rawPage } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim() || undefined;
  const page = Math.max(1, Number(Array.isArray(rawPage) ? rawPage[0] : rawPage) || 1);
  const { products, total, pageCount } = await listAdminProducts({ q, page });

  return (
    <div className="space-y-4">
      <form action="/admin/products" className="relative max-w-md">
        <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search products"
          className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm"
        />
      </form>
      <p className="text-sm text-muted-foreground">{total} products</p>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-background">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/admin/products/${p.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/50">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
                {p.images[0] ? (
                  <Image src={p.images[0]} alt="" fill sizes="48px" className="object-contain" />
                ) : (
                  <DeviceArt kind={p.category.parent?.icon ?? p.category.icon ?? "smartphone"} className="p-1.5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.brand.name} · {p.category.name}
                  {p.releaseYear && ` · ${p.releaseYear}`} · {p.images.length} {p.images.length === 1 ? "photo" : "photos"}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">{p._count.offers} live offers</span>
              {!p.isActive && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">Hidden</span>}
            </Link>
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <nav className="flex justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href={`/admin/products?${new URLSearchParams({ ...(q && { q }), page: String(page - 1) })}`}>Previous</Link>
            </Button>
          )}
          {page < pageCount && (
            <Button asChild variant="outline">
              <Link href={`/admin/products?${new URLSearchParams({ ...(q && { q }), page: String(page + 1) })}`}>Next</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
