"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BanknoteIcon,
  CheckIcon,
  ShoppingCartIcon,
  TruckIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/lang-provider";
import { ProductGallery } from "@/components/product/product-gallery";
import { Button } from "@/components/ui/button";
import { type Dict, optionName, optionValueLabel } from "@/i18n";
import {
  findVariant,
  nearestBuyable,
  type OfferSummary,
  type Picker,
  pickerStates,
  savingsPercent,
  type Selection,
  selectionToParams,
  selectValue,
  type VariantSummary,
} from "@/lib/pricing";
import { addToCart as addToCartStore } from "@/lib/cart-store";
import { formatPkr, site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  brand: string;
  releaseYear: number | null;
  kind: string;
  images: { url: string; alt: string }[];
  imagesByProduct: Record<string, { url: string; alt: string }[]>;
  newPrice: number | null;
  pickers: Picker[];
  variants: VariantSummary[];
  initialSelection: Selection;
};

export function ProductPurchase({ name, brand, releaseYear, kind, images, imagesByProduct, newPrice, pickers, variants, initialSelection }: Props) {
  const router = useRouter();
  const { t, href } = useI18n();
  const [selection, setSelection] = useState(initialSelection);
  const [last, setLast] = useState<{ pickerId: string; valueId: string } | null>(null);
  const [added, setAdded] = useState(false);

  const variant = useMemo(() => findVariant(variants, selection), [variants, selection]);
  const offer = variant?.offers[0] ?? null;

  // The selected colour/storage's own photos first, then the photos shared by the whole page.
  const photos = useMemo(() => {
    const own = (variant?.productId && imagesByProduct[variant.productId]) || [];
    return [...own, ...images];
  }, [variant, imagesByProduct, images]);

  const colorPicker = pickers.find((p) => p.type === "COLOR");
  const colorHex = colorPicker?.values.find((v) => v.id === selection[colorPicker.id])?.colorHex ?? undefined;
  const summary = pickers
    .map((p) => {
      const value = p.values.find((v) => v.id === selection[p.id]);
      return value && optionValueLabel(t, p.type, value);
    })
    .filter(Boolean);

  // When the chosen combination is out of stock, the nearest buyable one is offered as an explicit button. It is never applied silently.
  const suggestion = useMemo(() => {
    if (offer || !last) return null;
    const next = nearestBuyable(pickers, variants, selection, last.pickerId, last.valueId);
    const found = findVariant(variants, next);
    if (!found || found.offers.length === 0) return null;
    const label = pickers
      .map((p) => {
        const value = p.values.find((v) => v.id === next[p.id]);
        return value && optionValueLabel(t, p.type, value);
      })
      .filter(Boolean)
      .join(" · ");
    return { next, label, price: found.offers[0].price };
  }, [offer, last, pickers, variants, selection, t]);

  function choose(pickerId: string, valueId: string) {
    setLast({ pickerId, valueId });
    const next = selectValue(pickers, variants, selection, pickerId, valueId);
    setSelection(next);
    // Keep the URL shareable without a server round trip.
    window.history.replaceState(null, "", `?${selectionToParams(pickers, next)}`);
  }

  function addToCart() {
    if (!offer) return;
    // The cart lives in this browser; the ERP re-checks price and stock when the order is placed.
    const capped = addToCartStore(offer.id, 1, offer.stock);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
    toast.success(capped ? t.product.maxInCart : t.product.added, {
      description: `${name} · ${summary.join(" · ")}`,
      action: { label: t.product.viewCart, onClick: () => router.push(href("/cart")) },
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="lg:sticky lg:top-36 lg:self-start">
        <ProductGallery key={variant?.productId ?? "none"} name={name} images={photos} kind={kind} colorHex={colorHex} />
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {brand}
            {releaseYear && ` · ${releaseYear}`} · {t.product.refurbished}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{summary.join(" · ")}</p>
        </div>

        <PriceBlock
          t={t}
          offer={offer}
          newPrice={newPrice}
          suggestion={suggestion}
          onShowAvailable={() => suggestion && setSelection(suggestion.next)}
        />

        <Button
          size="lg"
          className={cn("hidden h-12 w-full text-base transition-all duration-200 active:scale-[0.98] lg:flex", added && "animate-[added-pop_300ms_ease-out]")}
          disabled={!offer}
          onClick={addToCart}
        >
          {added ? <CheckIcon data-icon="inline-start" /> : <ShoppingCartIcon data-icon="inline-start" />}
          {!offer ? t.common.soldOut : added ? t.product.added : t.product.addToCart}
        </Button>

        {offer && <Facts t={t} offer={offer} />}
        {offer && <Perks t={t} />}

        <div className="space-y-6 border-t pt-6">
          {pickers.map((picker) => (
            <PickerGroup
              key={picker.id}
              t={t}
              picker={picker}
              states={pickerStates(picker, variants, selection)}
              selected={selection[picker.id]}
              onSelect={(valueId) => choose(picker.id, valueId)}
            />
          ))}
        </div>
      </div>

      {/* Mobile: price and button stay reachable while scrolling the pickers. */}
      <div
        data-sticky-buy-bar
        className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{summary.join(" · ")}</p>
          <p className="text-lg font-semibold">{offer ? formatPkr(offer.price) : t.common.soldOut}</p>
        </div>
        <Button size="lg" className="h-11 px-6 transition-all duration-200 active:scale-[0.97]" disabled={!offer} onClick={addToCart}>
          {offer ? t.product.addToCart : t.common.soldOut}
        </Button>
      </div>
    </div>
  );
}

function PriceBlock({
  t,
  offer,
  newPrice,
  suggestion,
  onShowAvailable,
}: {
  t: Dict;
  offer: OfferSummary | null;
  newPrice: number | null;
  suggestion: { label: string; price: number } | null;
  onShowAvailable: () => void;
}) {
  if (!offer) {
    return (
      <div className="animate-in fade-in-0 space-y-3 rounded-xl bg-secondary px-4 py-3 text-sm duration-200">
        <p className="text-base font-semibold">{t.common.soldOut}</p>
        <p>{t.product.unavailable}</p>
        {suggestion && (
          <button
            type="button"
            onClick={onShowAvailable}
            className="w-full rounded-lg border bg-background px-3 py-2 text-start font-medium transition-all duration-200 hover:border-foreground/30 active:scale-[0.99]"
          >
            <span className="block text-xs text-muted-foreground">{t.product.showAvailable}</span>
            {suggestion.label} · {formatPkr(suggestion.price)}
          </button>
        )}
      </div>
    );
  }
  const saving = newPrice ? newPrice - offer.price : 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-4xl font-semibold tracking-tight">{formatPkr(offer.price)}</p>
        {saving > 0 && newPrice && (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="line-through">{formatPkr(newPrice)}</span> {t.common.new}
            </p>
            <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm font-bold text-savings">
              {t.product.save(formatPkr(saving), savingsPercent(offer.price, newPrice))}
            </span>
          </>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold text-savings">{t.product.inStock}</p>
    </div>
  );
}

function Facts({ t, offer }: { t: Dict; offer: OfferSummary }) {
  const chips = [
    offer.ptaStatus,
    offer.grade != null ? t.common.gradeChip(offer.grade) : null,
    offer.batteryHealth != null ? t.common.batteryChip(offer.batteryHealth) : null,
    offer.warrantyMonths > 0 ? t.common.monthWarranty(offer.warrantyMonths) : null, // no warranty is never shown as a pill
  ].filter(Boolean) as string[];
  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <li key={c} className="rounded-full border bg-secondary px-3 py-1 text-xs font-medium">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Perks({ t }: { t: Dict }) {
  const items = [
    { icon: TruckIcon, text: t.product.perks.delivery },
    { icon: BanknoteIcon, text: t.product.perks.payment },
    { icon: Undo2Icon, text: t.common.dayReturns(site.returnDays) },
  ];
  return (
    <ul className="space-y-2.5 rounded-2xl border p-4 text-sm">
      {items.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-3">
          <Icon className="size-4.5 shrink-0 text-primary" />
          {text}
        </li>
      ))}
    </ul>
  );
}

function PickerGroup({
  t,
  picker,
  states,
  selected,
  onSelect,
}: {
  t: Dict;
  picker: Picker;
  states: ReturnType<typeof pickerStates>;
  selected: string;
  onSelect: (valueId: string) => void;
}) {
  const help =
    picker.type === "CONDITION"
      ? { href: "#condition-guide", label: t.product.gradesHelp }
      : picker.type === "SIM"
        ? { href: "#pta", label: t.product.ptaHelp }
        : null;
  const selectedValue = picker.values.find((v) => v.id === selected);
  const conditionNote = picker.type === "CONDITION" && selectedValue ? t.conditions[selectedValue.value]?.summary : null;

  return (
    <fieldset>
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <legend className="font-semibold">
          {optionName(t, picker.name)}
          {picker.type === "COLOR" && selectedValue && <span className="font-normal text-muted-foreground">: {selectedValue.label}</span>}
        </legend>
        {help && (
          <a href={help.href} className="text-sm font-medium text-primary hover:underline">
            {help.label}
          </a>
        )}
      </div>
      <div className={cn("grid gap-2", picker.values.length > 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2")}>
        {picker.values.map((value) => {
          const state = states.find((s) => s.valueId === value.id)!;
          const isSelected = value.id === selected;
          const disabled = state.status === "unavailable";
          return (
            <button
              key={value.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelect(value.id)}
              className={cn(
                "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-start transition-all duration-200 active:scale-[0.97]",
                isSelected ? "border-primary bg-accent ring-2 ring-primary/30" : "hover:border-foreground/30",
                disabled && "cursor-not-allowed opacity-45",
              )}
            >
              {value.colorHex && (
                <span className="size-5 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: value.colorHex }} />
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{optionValueLabel(t, picker.type, value)}</span>
                <span className={cn("block text-xs", state.status === "exact" ? "text-foreground/70" : "text-muted-foreground")}>
                  {disabled || state.status === "soldout" ? t.common.soldOut : state.status === "exact" ? formatPkr(state.price!) : t.common.fromPrice(formatPkr(state.price!))}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {conditionNote && <p className="mt-2 text-sm text-muted-foreground">{conditionNote}</p>}
    </fieldset>
  );
}
