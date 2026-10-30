import type { Metadata } from "next";
import { Suspense } from "react";
import { deleteBannerAction, saveBannerAction } from "@/app/actions/admin-catalog";
import { ActionForm } from "@/components/console/action-form";
import { PageHeader } from "@/components/console/console-shell";
import { BANNER_THEMES, bannerThemeClass } from "@/components/home/banner-theme";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home banners · Admin", robots: { index: false } };

const input = "h-9 w-full rounded-lg border border-input bg-background px-2 text-sm";

const PLACEMENTS = [
  { value: "HOME_HERO", label: "Hero (top of the home page)", note: "The first active hero banner is shown." },
  { value: "HOME_PROMO", label: "Promo cards", note: "Shown side by side under the categories." },
] as const;

export default function BannersPage() {
  return (
    <>
      <PageHeader
        title="Home banners"
        description="Changes appear on the home page immediately. Urdu fields are shown on the Urdu site; leave them empty to use the English text."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-background" />}>
        <Banners />
      </Suspense>
    </>
  );
}

async function Banners() {
  await requireAdmin("/admin/banners");
  const banners = await db.banner.findMany({ orderBy: [{ placement: "asc" }, { sortOrder: "asc" }] });

  return (
    <div className="space-y-8">
      {PLACEMENTS.map((p) => (
        <section key={p.value} className="space-y-3">
          <div>
            <h2 className="font-semibold">{p.label}</h2>
            <p className="text-sm text-muted-foreground">{p.note}</p>
          </div>
          {banners
            .filter((b) => b.placement === p.value)
            .map((b) => (
              <BannerForm key={b.id} banner={b} placement={p.value} />
            ))}
          <details className="rounded-2xl border border-dashed bg-background p-4">
            <summary className="cursor-pointer text-sm font-semibold text-primary">Add a banner</summary>
            <div className="mt-4">
              <BannerForm placement={p.value} />
            </div>
          </details>
        </section>
      ))}
    </div>
  );
}

function BannerForm({ banner, placement }: { banner?: Banner; placement: string }) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      {banner && (
        <div className={cn("mb-4 rounded-xl p-4", bannerThemeClass(banner.theme), !banner.isActive && "opacity-50")}>
          <p className="font-bold">{banner.title}</p>
          {banner.subtitle && <p className="text-sm text-foreground/75">{banner.subtitle}</p>}
        </div>
      )}
      <ActionForm action={saveBannerAction} resetOnSuccess={!banner} className="grid gap-3 md:grid-cols-6">
        <input type="hidden" name="id" value={banner?.id ?? ""} />
        <input type="hidden" name="placement" value={placement} />
        <label className="grid gap-1 text-xs font-medium md:col-span-3">
          Title
          <input name="title" required defaultValue={banner?.title} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-3">
          Subtitle
          <input name="subtitle" defaultValue={banner?.subtitle ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2">
          Button text
          <input name="ctaLabel" defaultValue={banner?.ctaLabel ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2">
          Title (Urdu, optional)
          <input name="titleUr" dir="rtl" lang="ur" defaultValue={banner?.titleUr ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2">
          Subtitle (Urdu, optional)
          <input name="subtitleUr" dir="rtl" lang="ur" defaultValue={banner?.subtitleUr ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2">
          Button text (Urdu, optional)
          <input name="ctaLabelUr" dir="rtl" lang="ur" defaultValue={banner?.ctaLabelUr ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium md:col-span-2">
          Button link
          <input name="ctaHref" placeholder="/l/smartphones" defaultValue={banner?.ctaHref ?? ""} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Color
          <select name="theme" defaultValue={banner?.theme ?? "mint"} className={input}>
            {BANNER_THEMES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Order
          <input name="sortOrder" type="number" min={0} defaultValue={banner?.sortOrder ?? 0} className={input} />
        </label>
        <div className="flex items-center gap-3 md:col-span-6">
          <label className="flex items-center gap-2 text-sm">
            <input name="isActive" type="checkbox" defaultChecked={banner?.isActive ?? true} className="accent-[var(--primary)]" />
            Active
          </label>
          <Button type="submit" size="sm" className="ml-auto">
            {banner ? "Save" : "Add banner"}
          </Button>
        </div>
      </ActionForm>
      {banner && (
        <ActionForm action={deleteBannerAction} confirm="Delete this banner?" className="mt-2 flex justify-end">
          <input type="hidden" name="id" value={banner.id} />
          <Button type="submit" variant="ghost" size="xs" className="text-destructive">
            Delete banner
          </Button>
        </ActionForm>
      )}
    </div>
  );
}
