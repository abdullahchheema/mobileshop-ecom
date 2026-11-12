"use client";

import { useState } from "react";
import Image from "next/image";
import { useI18n } from "@/components/i18n/lang-provider";
import { DeviceArt } from "@/components/product/device-art";
import { creditForImage } from "@/lib/product-photos";
import { cn } from "@/lib/utils";

/** Product photos with thumbnails, or the tinted illustration when there are none. */
export function ProductGallery({
  name,
  images,
  kind,
  colorHex,
}: {
  name: string;
  images: string[];
  kind: string;
  colorHex?: string;
}) {
  const [index, setIndex] = useState(0);
  const { t } = useI18n();

  if (images.length === 0) {
    return (
      <>
        <div className="aspect-square rounded-3xl bg-secondary p-10 md:p-16">
          <DeviceArt kind={kind} color={colorHex} />
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t.product.illustration}</p>
      </>
    );
  }

  const current = images[Math.min(index, images.length - 1)];
  const credit = creditForImage(current);
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-secondary">
        <Image src={current} alt={name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-6" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={t.product.photo(i + 1)}
              aria-current={src === current}
              onClick={() => setIndex(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-secondary",
                src === current ? "border-primary" : "border-transparent hover:border-foreground/20",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {t.product.photosNote}
        {credit && (
          <>
            {" "}
            {t.product.photoBy}: {credit.author},{" "}
            <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {credit.license}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
