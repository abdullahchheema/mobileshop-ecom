import { isLang, type Lang } from "@/i18n/config";
import { type Dict, en } from "@/i18n/dictionaries/en";
import { ur } from "@/i18n/dictionaries/ur";

// Both dictionaries are small, so they're bundled directly (no async loading).
const DICTS: Record<Lang, Dict> = { en, ur };

export const getDict = (lang: Lang): Dict => DICTS[lang];

/** Date in the buyer's language, Pakistan time. */
export const formatDateFor = (date: Date, lang: Lang) =>
  new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-PK", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(date);

export type { Dict };

/** Category names come from the database in English; top-level ones have translations. */
export const categoryLabel = (t: Dict, slug: string, name: string) => t.categories[slug] ?? name;

/** The page's language from its [lang] route param. */
export async function langOf(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : "en";
}

/** Option names ("Storage") and values ("Good", "PTA approved") as stored in the catalog, translated. */
export const optionName = (t: Dict, name: string) => t.options.names[name] ?? name;
export const optionValueLabel = (t: Dict, type: string, value: { value: string; label: string }) =>
  (type === "CONDITION" ? t.conditions[value.value]?.label : t.options.values[value.label]) ?? value.label;

// English condition labels ("Good") back to their keys ("good").
const CONDITION_KEYS = Object.fromEntries(Object.entries(en.conditions).map(([key, c]) => [c.label, key]));

/** Translates a stored "Good · 128 GB · PTA approved" label; parts without a translation (sizes, colors) stay as they are. */
export const variantLabelFor = (t: Dict, label: string) =>
  label
    .split(" · ")
    .map((part) => {
      const condition = CONDITION_KEYS[part];
      return (condition && t.conditions[condition]?.label) ?? t.options.values[part] ?? part;
    })
    .join(" · ");

/** Wraps text that must read left to right (phone numbers) so Urdu sentences don't reorder it. */
export const ltr = (text: string) => `⁦${text}⁩`;
