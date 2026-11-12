import Image from "next/image";
import Link from "@/components/i18n/link";
import { DeviceArt } from "@/components/product/device-art";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import type { ProductCardData } from "@/lib/catalog";
import { formatPkr } from "@/lib/site";
import { cn } from "@/lib/utils";

const MAX_SWATCHES = 4;

export function ProductCard({
  product,
  query = "",
  className,
  lang = "en",
}: {
  product: ProductCardData;
  query?: string;
  className?: string;
  lang?: Lang;
}) {
  const t = getDict(lang);
  const extraColors = product.colors.length - MAX_SWATCHES;

  return (
    <Link
      href={`/p/${product.slug}${query}`}
      className={cn(
        "group flex h-full flex-col rounded-xl border bg-card p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_16px_0_rgba(17,15,21,0.12)] active:translate-y-0 motion-reduce:transform-none",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 768px) 33vw, 50vw"
            className={cn("object-contain transition duration-300 group-hover:scale-105", product.soldOut && "opacity-60")}
          />
        ) : (
          <DeviceArt kind={product.kind} color={product.colors[0]?.hex} className="p-3 transition duration-300 group-hover:scale-105" />
        )}
      </div>

      <div className="flex flex-1 flex-col pt-2">
        <div className="flex min-h-5 items-center justify-between gap-2">
          {product.savings >= 10 && (
            <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-medium text-savings">{t.card.saveChip(product.savings)}</span>
          )}
          {product.colors.length > 1 && (
            <div className="ms-auto flex items-center gap-1" aria-label={t.card.colors(product.colors.length)}>
              {product.colors.slice(0, MAX_SWATCHES).map((c) => (
                <span key={c.label} title={c.label} className="size-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
              ))}
              {extraColors > 0 && <span className="text-xs text-muted-foreground">+{extraColors}</span>}
            </div>
          )}
        </div>
        <h3 className="mt-2 text-sm leading-snug font-semibold">{product.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {product.brand}
          {product.releaseYear && ` · ${product.releaseYear}`} · {t.common.offers(product.offerCount)}
        </p>

        <div className="mt-auto pt-3">
          {product.soldOut ? (
            <p className="text-lg leading-tight font-semibold text-muted-foreground">{t.common.soldOut}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{t.common.from}</p>
              <p className="text-lg leading-tight font-semibold">{formatPkr(product.fromPrice)}</p>
            </>
          )}
          {!product.soldOut && product.newPrice && product.newPrice > product.fromPrice && (
            <>
              <p className="text-xs font-medium text-savings">{t.card.saveAmount(formatPkr(product.newPrice - product.fromPrice))}</p>
              <p className="text-xs text-muted-foreground">
                <span className="line-through">{formatPkr(product.newPrice)}</span> {t.common.new}
              </p>
            </>
          )}
          <span className="mt-3 flex h-9 items-center justify-center rounded-lg border text-sm font-medium transition group-hover:bg-secondary">
            {t.card.view}
          </span>
        </div>
      </div>
    </Link>
  );
}
