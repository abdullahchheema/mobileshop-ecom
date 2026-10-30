import type { Metadata } from "next";
import { Suspense } from "react";
import { createBrandAction, createCategoryAction, deleteBrandAction, deleteCategoryAction, updateCategoryAction } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { CATEGORY_ICON_KEYS } from "@/components/layout/category-icon";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Categories & brands · Admin", robots: { index: false } };

const input = "h-9 rounded-lg border border-input bg-background px-2 text-sm";

export default function CategoriesPage() {
  return (
    <>
      <PageHeader
        title="Categories & brands"
        description="Featured top-level categories appear in the header, the home page and the footer."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Catalog />
      </Suspense>
    </>
  );
}

async function Catalog() {
  await requireAdmin("/admin/categories");
  const [categories, brands] = await Promise.all([
    db.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
        children: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } },
      },
    }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <ActionForm action={createCategoryAction} resetOnSuccess className="flex flex-wrap items-end gap-2 rounded-2xl border bg-background p-4">
          <label className="grid gap-1 text-xs font-medium">
            New category
            <input name="name" required placeholder="e.g. Realme" className={`${input} w-48`} />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Inside
            <select name="parentId" className={input} defaultValue="">
              <option value="">Top level</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Icon
            <select name="icon" className={input} defaultValue="">
              <option value="">None</option>
              {CATEGORY_ICON_KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <Button type="submit">Add</Button>
        </ActionForm>

        {categories.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-background">
            <CategoryRow category={c} topLevel />
            {c.children.length > 0 && (
              <div className="divide-y border-t bg-secondary/30 pl-6">
                {c.children.map((child) => (
                  <CategoryRow key={child.id} category={child} />
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-3 rounded-2xl border bg-background p-4 xl:self-start">
        <h2 className="font-semibold">Brands</h2>
        <ActionForm action={createBrandAction} resetOnSuccess className="flex gap-2">
          <input name="name" required placeholder="New brand" className={`${input} flex-1`} />
          <Button type="submit">Add</Button>
        </ActionForm>
        <ul className="divide-y text-sm">
          {brands.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                {b.name} <span className="text-xs text-muted-foreground">· {b._count.products} products</span>
              </span>
              {b._count.products === 0 && (
                <ActionForm action={deleteBrandAction} confirm={`Delete ${b.name}?`}>
                  <input type="hidden" name="id" value={b.id} />
                  <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                    Delete
                  </Button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isFeatured: boolean;
  _count: { products: number };
};

function CategoryRow({ category: c, topLevel = false }: { category: Row; topLevel?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      <ActionForm action={updateCategoryAction} className="flex flex-1 flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={c.id} />
        <input name="name" defaultValue={c.name} aria-label="Name" className={`${input} w-44 font-semibold`} />
        <span className="text-xs text-muted-foreground">/l/{c.slug}</span>
        {topLevel && (
          <select name="icon" defaultValue={c.icon ?? ""} aria-label="Icon" className={input}>
            <option value="">No icon</option>
            {CATEGORY_ICON_KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1 text-xs">
          Order
          <input name="sortOrder" type="number" defaultValue={c.sortOrder} className={`${input} w-16`} />
        </label>
        {topLevel && (
          <label className="flex items-center gap-1.5 text-xs">
            <input name="isFeatured" type="checkbox" defaultChecked={c.isFeatured} className="accent-[var(--primary)]" />
            Featured
          </label>
        )}
        <span className="text-xs text-muted-foreground">{c._count.products} products</span>
        <Button type="submit" size="sm" variant="outline">
          Save
        </Button>
      </ActionForm>
      <ActionForm action={deleteCategoryAction} confirm={`Delete ${c.name}?`}>
        <input type="hidden" name="id" value={c.id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          Delete
        </Button>
      </ActionForm>
    </div>
  );
}
