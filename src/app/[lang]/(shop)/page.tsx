import type { Metadata } from "next";
import Link from "@/components/i18n/link";
import {
  BadgeCheckIcon,
  BanknoteIcon,
  ClipboardCheckIcon,
  FlameIcon,
  PackageCheckIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  TrophyIcon,
  TruckIcon,
  Undo2Icon,
} from "lucide-react";
import { bannerThemeClass } from "@/components/home/banner-theme";
import { ProductTabs } from "@/components/home/product-tabs";
import { Carousel, CarouselItem } from "@/components/product/carousel";
import { DeviceArt } from "@/components/product/device-art";
import { ProductRail } from "@/components/product/product-rail";
import { Button } from "@/components/ui/button";
import { getBanners, getBrands, getNavCategories, getProductRail } from "@/lib/catalog";
import { site } from "@/lib/site";
import type { Banner } from "@/generated/prisma/client";
import type { Lang } from "@/i18n/config";
import { categoryLabel, type Dict, getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  return { alternates: alternatesFor("/", await langOf(params)) };
}

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  const [banners, promoBanners, categories, deals, bestSellers, phones, laptops, brands] = await Promise.all([
    getBanners("HOME_HERO"),
    getBanners("HOME_PROMO"),
    getNavCategories(),
    getProductRail({ sort: "savings", limit: 12 }),
    getProductRail({ sort: "popular", limit: 12 }),
    getProductRail({ category: "smartphones", sort: "popular", limit: 12 }),
    getProductRail({ category: "laptops", sort: "popular", limit: 12 }),
    getBrands(),
  ]);

  const [hero] = banners.map((b) => bannerIn(b, lang));
  const promos = promoBanners.map((b) => bannerIn(b, lang));

  // "Most wanted": every subcategory, shown with its parent's icon.
  const shortcuts = categories.flatMap((c) => c.children.map((child) => ({ ...child, icon: c.icon })));

  return (
    <>
      <SiteJsonLd />
      {hero && <Hero banner={hero} />}

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-10">
        <section>
          <Carousel label={t.home.mostWanted} heading={<SectionTitle>{t.home.mostWanted}</SectionTitle>}>
            <CarouselItem className="w-28 sm:w-32">
              <Link href="/deals" className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-ink p-2 text-center font-semibold text-lime">
                <FlameIcon className="size-7" />
                {t.home.bestDeals}
              </Link>
            </CarouselItem>
            {shortcuts.map((s, i) => (
              <CarouselItem key={s.id} className="w-28 sm:w-32">
                <Link href={`/l/${s.slug}`} className="group block text-center text-sm font-medium">
                  <span className="block aspect-square rounded-xl border bg-card p-3 transition group-hover:shadow-md">
                    <DeviceArt kind={s.icon ?? "phone"} color={TILE_COLORS[i % TILE_COLORS.length]} />
                  </span>
                  <span className="mt-2 block">{categoryLabel(t, s.slug, s.name)}</span>
                </Link>
              </CarouselItem>
            ))}
          </Carousel>
        </section>

        {promos.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2" aria-label="Promotions">
            {promos.map((p, i) => (
              <div key={p.id} className={cn("flex flex-col overflow-hidden rounded-2xl", bannerThemeClass(p.theme))}>
                <PromoArt variant={i} />
                <div className="flex flex-1 flex-col items-start p-6">
                  <h2 className="text-xl font-semibold tracking-tight">{p.title}</h2>
                  {p.subtitle && <p className="mt-1 text-sm text-foreground/75">{p.subtitle}</p>}
                  {p.ctaHref && (
                    <Button asChild size="sm" className="mt-4 h-8 px-3">
                      <Link href={p.ctaHref}>{p.ctaLabel}</Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-3">
          <SectionTitle>{t.home.todaysDeals}</SectionTitle>
          <ProductTabs
            label={t.home.todaysDeals}
            lang={lang}
            tabs={[
              { id: "price-drop", label: t.home.priceDrop, icon: <TrendingDownIcon />, products: deals },
              { id: "best-sellers", label: t.home.bestSellers, icon: <TrophyIcon />, products: bestSellers },
            ]}
          />
        </section>

        <TrendzPromise t={t} />

        <ProductRail title={t.home.popularPhones} products={phones} href="/l/smartphones" lang={lang} />

        <HowItWorks t={t} />

        <section className="grid items-center gap-6 overflow-hidden rounded-2xl bg-ink px-6 pt-8 text-white md:grid-cols-2 md:px-10 md:py-10">
          <div className="flex flex-col items-start">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t.home.services.sell.title}</h2>
            <p className="mt-2 text-white/75">{t.home.services.sell.text}</p>
            <Button asChild size="sm" className="mt-5 h-8 bg-white px-3 text-ink hover:bg-white/85">
              <Link href="/sell">{t.home.services.sell.cta}</Link>
            </Button>
          </div>
          <div aria-hidden className="mx-auto flex h-44 w-full max-w-sm items-end justify-center md:h-56">
            <DeviceArt kind="tablet" color="#9351f6" className="-me-10 h-full" />
            <DeviceArt kind="phone" color="#e3f77e" className="z-10 h-5/6" />
          </div>
        </section>

        <ProductRail title={t.home.popularLaptops} products={laptops} href="/l/laptops" lang={lang} />

        <section aria-labelledby="services" className="space-y-4">
          <SectionTitle id="services">{t.home.more}</SectionTitle>
          <div className="grid gap-4 md:grid-cols-3">
            <ServiceTile
              href="/trade-in"
              icon={<RefreshCwIcon />}
              title={t.home.services.tradeIn.title}
              text={t.home.services.tradeIn.text}
              theme="bg-sky"
              cta={t.home.learnMore}
              badge={t.home.services.tradeIn.badge}
            />
            <ServiceTile
              href="/help/cash-on-delivery"
              icon={<BanknoteIcon />}
              title={t.home.services.cod.title}
              text={t.home.services.cod.text}
              theme="bg-lime"
              cta={t.home.learnMore}
            />
            <ServiceTile
              href="/help/warranty"
              icon={<ShieldCheckIcon />}
              title={t.common.monthWarranty(site.warrantyMonths)}
              text={t.home.services.warranty.text}
              theme="bg-lilac"
              cta={t.home.learnMore}
            />
          </div>
        </section>

        {brands.length > 0 && (
          <section>
            <Carousel label={t.home.brands} heading={<SectionTitle>{t.home.brands}</SectionTitle>}>
              {brands.map((b) => (
                <CarouselItem key={b.slug} className="w-40 sm:w-[13.5rem]">
                  <Link
                    href={`/search?brand=${b.slug}`}
                    className="flex h-24 items-center justify-center rounded-xl border bg-card px-3 text-xl font-bold tracking-tight transition hover:shadow-md"
                  >
                    {b.name}
                  </Link>
                </CarouselItem>
              ))}
            </Carousel>
          </section>
        )}
      </div>
    </>
  );
}

const TILE_COLORS = ["#110f15", "#b3c8ef", "#ffb5b3", "#94f5bc", "#ceb5f2", "#f1cd8e", "#d0d2d8"];

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

/** Full-width band under the header. */
function Hero({ banner }: { banner: ReturnType<typeof bannerIn> }) {
  return (
    <section className={cn("overflow-hidden", bannerThemeClass(banner.theme))}>
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-10 md:min-h-96 md:grid-cols-2 md:py-8">
        <div className="flex flex-col items-start">
          <h1 className="text-3xl font-semibold tracking-tight text-balance md:text-5xl">{banner.title}</h1>
          {banner.subtitle && <p className="mt-3 max-w-md text-foreground/80">{banner.subtitle}</p>}
          {banner.ctaHref && (
            <Button asChild className="mt-6 h-9 px-4">
              <Link href={banner.ctaHref}>{banner.ctaLabel}</Link>
            </Button>
          )}
        </div>
        <HeroArt />
      </div>
    </section>
  );
}

/** Overlapping devices on the end side of the hero. */
function HeroArt() {
  return (
    <div aria-hidden className="relative mx-auto h-64 w-full max-w-md md:h-96 md:max-w-none">
      <DeviceArt kind="laptop" color="#d0d2d8" className="absolute inset-y-0 end-4 size-auto h-full" />
      <DeviceArt kind="tablet" color="#7f34d5" className="absolute start-0 bottom-0 size-auto h-3/5 -rotate-6" />
      <DeviceArt kind="phone" color="#110f15" className="absolute end-0 bottom-2 size-auto h-1/2 rotate-12" />
      <DeviceArt kind="phone" color="#ff4d6a" className="absolute start-1/3 bottom-0 size-auto h-1/2 -rotate-3" />
    </div>
  );
}

function PromoArt({ variant }: { variant: number }) {
  const devices =
    variant % 2 === 0
      ? [
          { kind: "phone", color: "#d0fbde" },
          { kind: "phone", color: "#ffb5b3" },
          { kind: "phone", color: "#110f15" },
        ]
      : [
          { kind: "tablet", color: "#d9e4fc" },
          { kind: "laptop", color: "#d0d2d8" },
          { kind: "headphones", color: "#2f3137" },
        ];
  return (
    <div aria-hidden className="flex h-48 items-end justify-center gap-1 px-6 pt-6">
      {devices.map((d, i) => (
        <DeviceArt key={i} kind={d.kind} color={d.color} className="size-auto h-full max-w-1/3" />
      ))}
    </div>
  );
}

function TrendzPromise({ t }: { t: Dict }) {
  const items = [
    { icon: ShieldCheckIcon, title: t.common.monthWarranty(site.warrantyMonths), text: t.home.promise.warranty },
    { icon: ClipboardCheckIcon, title: t.home.promise.inspection(site.inspectionPoints), text: t.home.promise.inspectionText },
    { icon: Undo2Icon, title: t.common.dayReturns(site.returnDays), text: t.home.promise.returns },
    { icon: BadgeCheckIcon, title: t.home.promise.verified, text: t.home.promise.verifiedText },
  ];
  return (
    <section aria-labelledby="promise" className="space-y-4">
      <SectionTitle id="promise">{t.home.promise.title}</SectionTitle>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border bg-card p-4">
            <Icon className="size-5" />
            <p className="mt-3 font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowItWorks({ t }: { t: Dict }) {
  const icons = [SearchIcon, PackageCheckIcon, TruckIcon, BanknoteIcon];
  const steps = t.home.how.steps.map((step, i) => ({ ...step, icon: icons[i] }));
  return (
    <section aria-labelledby="how-it-works" className="space-y-4">
      <SectionTitle id="how-it-works">{t.home.how.title}</SectionTitle>
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{i + 1}</span>
              <Icon className="size-5" />
            </div>
            <p className="mt-3 font-medium">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ServiceTile({
  href,
  icon,
  title,
  text,
  theme,
  cta,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
  theme: string;
  cta: string;
  badge?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-lg font-semibold">
        {title}
        {badge && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{badge}</span>}
      </p>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{text}</p>
      <Button asChild size="sm" className="mt-3 h-8 self-start px-3">
        <Link href={href}>{cta}</Link>
      </Button>
      <div aria-hidden className={cn("mt-4 flex h-36 items-center justify-center rounded-lg [&_svg]:size-14", theme)}>
        {icon}
      </div>
    </div>
  );
}

/** Organization and sitelinks search box data for search engines. */
function SiteJsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: site.name,
      url: site.url,
      logo: `${site.url}/icon.svg`,
      contactPoint: { "@type": "ContactPoint", telephone: site.supportPhone, email: site.supportEmail, contactType: "customer service", areaServed: "PK" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: site.name,
      url: site.url,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${site.url}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ];
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe here once "<" is escaped.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** A banner's text in the page language, falling back to English when no Urdu was entered. */
function bannerIn(banner: Banner, lang: Lang) {
  if (lang !== "ur") return banner;
  return {
    ...banner,
    title: banner.titleUr || banner.title,
    subtitle: banner.subtitleUr || banner.subtitle,
    ctaLabel: banner.ctaLabelUr || banner.ctaLabel,
  };
}
