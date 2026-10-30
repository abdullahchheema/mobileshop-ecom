"use client";

import Link from "@/components/i18n/link";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";

/** Shown when a storefront page calls notFound() (unknown product, category, order…). */
export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{t.notFound.title}</h1>
      <p className="mt-3 text-muted-foreground">{t.notFound.text}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t.notFound.back}</Link>
      </Button>
    </div>
  );
}
