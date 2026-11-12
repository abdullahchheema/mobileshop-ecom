import { getDict } from "@/i18n";
import type { Lang } from "@/i18n/config";
import { isCatalogueUnavailable } from "@/lib/catalog";

/** Shown above every shop page when the ERP could not be read, so an outage does not look like an empty shop. */
export async function CatalogueNotice({ lang }: { lang: Lang }) {
  if (!(await isCatalogueUnavailable())) return null;
  return (
    <p role="status" className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
      {getDict(lang).common.catalogueUnavailable}
    </p>
  );
}
