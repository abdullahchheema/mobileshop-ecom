// Buy-box logic for the product page. Pure functions so the server and the
// browser compute prices and option availability the same way.

export type PickerType = "CONDITION" | "BATTERY" | "STORAGE" | "RAM" | "PROCESSOR" | "SIM" | "COLOR" | "OTHER";

export type PickerValue = { id: string; label: string; value: string; colorHex: string | null };

export type Picker = {
  id: string;
  type: PickerType;
  name: string;
  /** URL query key, e.g. "storage" or "pta-status". */
  key: string;
  values: PickerValue[];
};

export type OfferSummary = {
  id: string;
  price: number;
  stock: number;
  warrantyMonths: number;
  seller: { name: string; slug: string; city: string };
};

export type VariantSummary = {
  id: string;
  valueIds: string[];
  /** Buyable offers only (active, in stock, approved seller), cheapest first. */
  offers: OfferSummary[];
};

/** Picker id → chosen value id. */
export type Selection = Record<string, string>;

export type ValueState = {
  valueId: string;
  /**
   * exact: buyable with the other current choices.
   * alternative: buyable, but other choices will change to make it work.
   * unavailable: nobody sells this value right now.
   */
  status: "exact" | "alternative" | "unavailable";
  price: number | null;
};

const inStock = (v: VariantSummary) => v.offers.length > 0;
const cheapest = (v: VariantSummary) => v.offers[0]?.price ?? Infinity;

export function findVariant(variants: VariantSummary[], selection: Selection) {
  const wanted = Object.values(selection);
  return variants.find((v) => wanted.every((id) => v.valueIds.includes(id))) ?? null;
}

export function selectionFromVariant(pickers: Picker[], variant: VariantSummary): Selection {
  const selection: Selection = {};
  for (const picker of pickers) {
    const value = picker.values.find((pv) => variant.valueIds.includes(pv.id));
    if (value) selection[picker.id] = value.id;
  }
  return selection;
}

/** Price and availability of every value of one picker, given the rest of the selection. */
export function pickerStates(
  picker: Picker,
  variants: VariantSummary[],
  selection: Selection,
): ValueState[] {
  return picker.values.map((value) => {
    const exact = findVariant(variants, { ...selection, [picker.id]: value.id });
    if (exact && inStock(exact)) return { valueId: value.id, status: "exact", price: cheapest(exact) };

    const prices = variants.filter((v) => inStock(v) && v.valueIds.includes(value.id)).map(cheapest);
    if (prices.length === 0) return { valueId: value.id, status: "unavailable", price: null };
    return { valueId: value.id, status: "alternative", price: Math.min(...prices) };
  });
}

/**
 * Chooses `valueId` for `pickerId`. If that exact combination isn't buyable, moves
 * to the buyable variant that keeps the most of the other choices, favouring
 * earlier pickers (condition before color), then the lower price.
 */
export function selectValue(
  pickers: Picker[],
  variants: VariantSummary[],
  selection: Selection,
  pickerId: string,
  valueId: string,
): Selection {
  const next = { ...selection, [pickerId]: valueId };
  const exact = findVariant(variants, next);
  if (exact && inStock(exact)) return next;

  const candidates = variants.filter((v) => inStock(v) && v.valueIds.includes(valueId));
  if (candidates.length === 0) return selection;

  const score = (v: VariantSummary) =>
    pickers.reduce((sum, picker, index) => {
      if (picker.id === pickerId) return sum;
      const kept = v.valueIds.includes(selection[picker.id]);
      return kept ? sum + 2 ** (pickers.length - index) : sum;
    }, 0);

  const best = candidates.reduce((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff > 0 ? b : a;
    return cheapest(b) < cheapest(a) ? b : a;
  });
  return selectionFromVariant(pickers, best);
}

/**
 * Starting selection: the cheapest buyable variant containing every `required`
 * value id. It must be the cheapest so the page opens at the "From" price that
 * listing cards advertise.
 */
export function defaultSelection(pickers: Picker[], variants: VariantSummary[], required: string[] = []): Selection {
  const choices = variants.filter((v) => inStock(v) && required.every((id) => v.valueIds.includes(id)));
  if (choices.length === 0) {
    return Object.fromEntries(pickers.map((p) => [p.id, p.values[0]?.id]).filter(([, v]) => v));
  }
  const best = choices.reduce((a, b) => (cheapest(b) < cheapest(a) ? b : a));
  return selectionFromVariant(pickers, best);
}

/**
 * Reads a selection from URL params like ?condition=good&storage=128-gb. Params
 * may name only some pickers (links from filtered listings): the rest are filled
 * with the cheapest buyable choice, so the price matches the listing card.
 */
export function selectionFromParams(
  pickers: Picker[],
  variants: VariantSummary[],
  params: Record<string, string | string[] | undefined>,
): Selection {
  const requested = pickers.flatMap((picker) => {
    const raw = params[picker.key];
    const slug = Array.isArray(raw) ? raw[0] : raw;
    const value = picker.values.find((v) => v.value === slug);
    return value ? [{ pickerId: picker.id, valueId: value.id }] : [];
  });

  const exact = defaultSelection(pickers, variants, requested.map((r) => r.valueId));
  const exactVariant = findVariant(variants, exact);
  if (exactVariant && inStock(exactVariant) && requested.every((r) => exact[r.pickerId] === r.valueId)) return exact;

  // Nothing buyable matches every param: honour them one by one, as clicks would.
  let selection = defaultSelection(pickers, variants);
  for (const r of requested) selection = selectValue(pickers, variants, selection, r.pickerId, r.valueId);
  return selection;
}

export function selectionToParams(pickers: Picker[], selection: Selection) {
  const params = new URLSearchParams();
  for (const picker of pickers) {
    const value = picker.values.find((v) => v.id === selection[picker.id]);
    if (value) params.set(picker.key, value.value);
  }
  return params;
}

/** Lowest/highest buyable price and number of offers, for listings and structured data. */
export function priceSummary(variants: VariantSummary[]) {
  const prices = variants.flatMap((v) => v.offers.map((o) => o.price));
  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices), offerCount: prices.length };
}

export function savingsPercent(price: number, newPrice: number | null | undefined) {
  if (!newPrice || newPrice <= price) return 0;
  return Math.round(((newPrice - price) / newPrice) * 100);
}
