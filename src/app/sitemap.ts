import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { LANGS, localizePath } from "@/i18n/config";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

// One entry per page, each listing its English and Urdu URLs as alternates.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, products } = await sitemapData();
  const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${site.url}${localizePath(path, "en")}`,
    lastModified,
    alternates: {
      languages: Object.fromEntries(LANGS.map((l) => [l === "ur" ? "ur-PK" : "en-PK", `${site.url}${localizePath(path, l)}`])),
    },
  });

  return [
    entry("/"),
    entry("/deals"),
    entry("/sell"),
    ...categories.map((c) => entry(`/l/${c.slug}`)),
    ...products.map((p) => entry(`/p/${p.slug}`, p.updatedAt)),
  ];
}

async function sitemapData() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "offers");

  const [categories, products] = await Promise.all([
    db.category.findMany({ select: { slug: true }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" } }),
  ]);
  return { categories, products };
}
