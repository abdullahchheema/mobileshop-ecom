"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";

const arrowClass = "rounded-full disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100";

/** Horizontal, swipeable row. Arrows sit beside the optional heading on larger screens. */
export function Carousel({
  label,
  heading,
  children,
}: {
  label: string;
  heading?: React.ReactNode;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const { t } = useI18n();
  const [ends, setEnds] = useState({ atStart: true, atEnd: false });

  const measure = () => {
    const el = track.current;
    if (!el) return;
    // scrollLeft is negative in right-to-left pages.
    const position = Math.abs(el.scrollLeft);
    setEnds({ atStart: position <= 1, atEnd: position + el.clientWidth >= el.scrollWidth - 1 });
  };

  useEffect(() => {
    if (!track.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track.current);
    return () => observer.disconnect();
  }, []);

  // In right-to-left pages "next" is to the left.
  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">{heading}</div>
        <div className="hidden shrink-0 gap-2 md:flex">
          <Button size="icon" className={arrowClass} disabled={ends.atStart} onClick={() => scroll(-1)} aria-label={t.common.previous}>
            <ChevronLeftIcon className="rtl:-scale-x-100" />
          </Button>
          <Button size="icon" className={arrowClass} disabled={ends.atEnd} onClick={() => scroll(1)} aria-label={t.common.next}>
            <ChevronRightIcon className="rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
      <ul
        ref={track}
        aria-label={label}
        onScroll={measure}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 scrollbar-none"
      >
        {children}
      </ul>
    </div>
  );
}

export function CarouselItem({ children, className = "w-48 sm:w-[13.5rem]" }: { children: React.ReactNode; className?: string }) {
  return <li className={`shrink-0 snap-start ${className}`}>{children}</li>;
}
