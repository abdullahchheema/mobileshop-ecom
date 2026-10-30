import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { SellerApplicationForm } from "@/components/seller/seller-application-form";
import { getSellerForUser } from "@/lib/sellers";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Apply to sell", robots: { index: false } };

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ label: "Sell on Trendz", href: "/sell" }, { label: "Apply" }]} />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Apply to sell on Trendz</h1>
        <p className="mt-2 text-muted-foreground">We review every application within 2 working days and let you know by SMS.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-secondary" />}>
        <Apply />
      </Suspense>
    </div>
  );
}

async function Apply() {
  const { user } = await requireSession("/sell/apply");
  if (await getSellerForUser(user.id)) redirect("/sell/status");
  return <SellerApplicationForm />;
}
