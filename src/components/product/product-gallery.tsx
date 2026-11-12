"use client";

import { useState } from "react";
import Image from "next/image";
import { useI18n } from "@/components/i18n/lang-provider";
import { DeviceArt } from "@/components/product/device-art";
import { cn } from "@/lib/utils";

/** Product photos with thumbnails, or the tinted illustration when there are none. */
export function ProductGallery({
  name,
  images,
  kind,
  colorHex,
}: {
  name: string;
  images: { url: string; alt: string }[];
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
  const currentUrl = current.url;
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-secondary">
        <Image key={currentUrl} src={currentUrl} alt={current.alt || name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="animate-in fade-in-0 object-contain p-6 duration-300" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {images.map(({ url: src }, i) => (
            <button
              key={src}
              type="button"
              aria-label={t.product.photo(i + 1)}
              aria-current={src === currentUrl}
              onClick={() => setIndex(i)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-secondary transition-all duration-200 hover:scale-105 active:scale-95",
                src === currentUrl ? "border-primary" : "border-transparent hover:border-foreground/20",
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {t.product.photosNote}
      </p>
    </div>
  );
}
