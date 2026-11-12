import type { MetadataRoute } from "next";
import { LANGS, localizePath } from "@/i18n/config";
import { getListing, getNavCategories } from "@/lib/catalog";
import { site } from "@/lib/site";

// One entry per page, each listing its English and Urdu URLs as alternates. Built from the ERP's catalogue.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, listing] = await Promise.all([
    getNavCategories(),
    getListing({ brands: [], storages: [], conditions: [], years: [], ptaOnly: false, sort: "popular", page: 1 }, 5000),
  ]);
  const entry = (path: string): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${localizePath(path, "en")}`,
    alternates: {
      languages: Object.fromEntries(LANGS.map((l) => [l === "ur" ? "ur-PK" : "en-PK", `${site.url}${localizePath(path, l)}`])),
    },
  });

  return [
    entry("/"),
    entry("/deals"),
    ...categories.map((c) => entry(`/l/${c.slug}`)),
    ...listing.items.map((p) => entry(`/p/${p.slug}`)),
  ];
}
