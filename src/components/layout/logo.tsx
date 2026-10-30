import Link from "@/components/i18n/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Trendz Mobile home" className={cn("flex shrink-0 items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" className="fill-primary" />
        {/* A phone outline wrapped by a "renew" arc */}
        <rect x="11" y="7" width="10" height="18" rx="2.5" fill="none" stroke="white" strokeWidth="2" />
        <path d="M24.5 12.5a9 9 0 0 1-3 12" fill="none" className="stroke-lime" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="16" cy="21.5" r="1.1" fill="white" />
      </svg>
      <span className="text-xl leading-none font-semibold tracking-tight">
        trendz<span className="font-medium text-primary">mobile</span>
      </span>
    </Link>
  );
}
