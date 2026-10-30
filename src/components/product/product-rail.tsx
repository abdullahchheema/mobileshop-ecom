import Link from "@/components/i18n/link";
import { ArrowRightIcon } from "lucide-react";
import { Carousel, CarouselItem } from "@/components/product/carousel";
import { ProductCard } from "@/components/product/product-card";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import type { ProductCardData } from "@/lib/catalog";

/** Carousel of product cards with an optional heading beside the arrows. */
export function ProductCarousel({
  label,
  products,
  lang,
  heading,
}: {
  label: string;
  products: ProductCardData[];
  lang: Lang;
  heading?: React.ReactNode;
}) {
  return (
    <Carousel label={label} heading={heading}>
      {products.map((p) => (
        <CarouselItem key={p.id}>
          <ProductCard product={p} lang={lang} />
        </CarouselItem>
      ))}
    </Carousel>
  );
}

/** A titled carousel of product cards. */
export function ProductRail({
  title,
  products,
  href,
  lang = "en",
}: {
  title: string;
  products: ProductCardData[];
  href?: string;
  lang?: Lang;
}) {
  if (products.length === 0) return null;
  return (
    <section>
      <ProductCarousel
        label={title}
        products={products}
        lang={lang}
        heading={
          <div className="flex items-baseline gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            {href && (
              <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                {getDict(lang).common.seeAll} <ArrowRightIcon className="size-4 rtl:-scale-x-100" />
              </Link>
            )}
          </div>
        }
      />
    </section>
  );
}
