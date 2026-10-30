"use client";

import { useState, useTransition } from "react";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { createListingAction, getListingContextAction } from "@/app/actions/seller";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

type Product = { slug: string; name: string; category: string };
type Context = NonNullable<Awaited<ReturnType<typeof getListingContextAction>>>;

export function NewListingForm({ products }: { products: Product[] }) {
  const [context, setContext] = useState<Context | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [warranty, setWarranty] = useState(12);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  const categories = [...new Set(products.map((p) => p.category))];
  const complete = context !== null && context.pickers.every((p) => chosen[p.id]);
  const valueIds = context ? context.pickers.map((p) => chosen[p.id]).filter(Boolean) : [];
  const variant = complete ? context.variants.find((v) => valueIds.every((id) => v.valueIds.includes(id))) : undefined;
  const alreadyListed = variant ? context?.listedVariantIds.includes(variant.id) : false;

  function pickProduct(slug: string) {
    setContext(null);
    setChosen({});
    if (!slug) return;
    startLoading(async () => setContext(await getListingContextAction(slug)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!context || !complete) return;
    startSaving(async () => {
      const result = await createListingAction({
        productId: context.productId,
        valueIds,
        price: Number(price),
        stock: Number(stock),
        warrantyMonths: warranty,
      });
      // Success redirects to the listings page; only errors come back.
      if (result && !result.ok) toast.error(result.error);
    });
  }

  return (
    <form method="post" onSubmit={submit} className="max-w-3xl space-y-6">
      <section className="space-y-2 rounded-2xl border bg-background p-5">
        <Label htmlFor="product">1. Which model are you selling?</Label>
        <select
          id="product"
          defaultValue=""
          onChange={(e) => pickProduct(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Choose a model from the catalog
          </option>
          {categories.map((c) => (
            <optgroup key={c} label={c}>
              {products
                .filter((p) => p.category === c)
                .map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Can&apos;t find your model? Contact support and we&apos;ll add it to the catalog.</p>
      </section>

      {loading && <div className="h-40 animate-pulse rounded-2xl bg-background" />}

      {context && (
        <section className="space-y-5 rounded-2xl border bg-background p-5">
          <p className="text-sm font-semibold">2. Describe the exact device</p>
          {context.pickers.map((picker) => (
            <fieldset key={picker.id}>
              <legend className="mb-2 text-sm font-medium">{picker.name}</legend>
              <div className="flex flex-wrap gap-2">
                {picker.values.map((value) => (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={chosen[picker.id] === value.id}
                    onClick={() => setChosen((c) => ({ ...c, [picker.id]: value.id }))}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                      chosen[picker.id] === value.id ? "border-primary bg-accent ring-2 ring-primary/20" : "hover:border-foreground/30",
                    )}
                  >
                    {value.colorHex && (
                      <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: value.colorHex }} />
                    )}
                    {value.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </section>
      )}

      {complete && (
        <section className="space-y-5 rounded-2xl border bg-background p-5">
          <p className="text-sm font-semibold">3. Price and stock</p>

          {alreadyListed ? (
            <p className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <TriangleAlertIcon className="size-4 shrink-0" /> You already list this exact device. Edit it in Listings instead.
            </p>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-sky p-3 text-sm">
              <InfoIcon className="size-4 shrink-0" />
              {variant?.lowest
                ? `Lowest price on Trendz for this exact device: ${formatPkr(variant.lowest)} (${variant.sellerCount} ${variant.sellerCount === 1 ? "seller" : "sellers"}). The cheapest offer is shown to buyers first.`
                : "Nobody sells this exact device yet. You'll be the only offer."}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (Rs)</Label>
              <input
                id="price"
                type="number"
                inputMode="numeric"
                min={1000}
                step={500}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 w-full rounded-lg border border-input px-3 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Units in stock</Label>
              <input
                id="stock"
                type="number"
                inputMode="numeric"
                min={0}
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-11 w-full rounded-lg border border-input px-3 text-sm tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty">Warranty</Label>
              <select
                id="warranty"
                value={warranty}
                onChange={(e) => setWarranty(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {[12, 18, 24, 36].map((m) => (
                  <option key={m} value={m}>
                    {m} months
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" size="lg" disabled={saving || alreadyListed || !price}>
            {saving ? "Publishing…" : "Publish listing"}
          </Button>
        </section>
      )}
    </form>
  );
}
