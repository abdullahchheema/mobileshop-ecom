// Basics fields shared by the "new product" and "edit product" forms.

type Option = { id: string; name: string };

const input = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function ProductBasicsFields({
  brands,
  categories,
  product,
}: {
  brands: Option[];
  categories: (Option & { children: Option[] })[];
  product?: {
    name: string;
    brandId: string;
    categoryId: string;
    releaseYear: number | null;
    newPrice: number | null;
    description: string | null;
    isActive: boolean;
  };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
        Model name
        <input name="name" required defaultValue={product?.name} placeholder="e.g. iPhone 15 Pro" className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Brand
        <select name="brandId" required defaultValue={product?.brandId ?? ""} className={input}>
          <option value="" disabled>
            Choose a brand
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Category
        <select name="categoryId" required defaultValue={product?.categoryId ?? ""} className={input}>
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>{c.name} (general)</option>
              {c.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Release year
        <input name="releaseYear" type="number" min={2000} max={2100} defaultValue={product?.releaseYear ?? ""} className={input} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Price when new (Rs)
        <input name="newPrice" type="number" min={0} step={1000} defaultValue={product?.newPrice ?? ""} className={input} />
        <span className="text-xs font-normal text-muted-foreground">Used for the &ldquo;Save X vs new&rdquo; badge.</span>
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} className="size-4 accent-[var(--primary)]" />
        Visible in the store
      </label>
    </div>
  );
}
