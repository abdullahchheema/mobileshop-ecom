import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { redirect } from "next/navigation";
import { CircleXIcon, ClockIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSellerForUser } from "@/lib/sellers";
import { requireSession } from "@/lib/session";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Seller application", robots: { index: false } };

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-secondary" />}>
        <Status />
      </Suspense>
    </div>
  );
}

async function Status() {
  const { user } = await requireSession("/sell/status");
  const seller = await getSellerForUser(user.id);
  if (!seller) redirect("/sell/apply");
  if (seller.status === "APPROVED") redirect("/seller");

  const content = {
    PENDING: {
      icon: <ClockIcon className="size-10 text-primary" />,
      title: "Your application is being reviewed",
      text: `Thanks for applying with ${seller.shopName}. We review applications within 2 working days and will send an SMS to ${seller.phone} when it's done.`,
    },
    REJECTED: {
      icon: <CircleXIcon className="size-10 text-destructive" />,
      title: "We couldn't approve your application",
      text: `Contact us at ${site.supportEmail} and we'll explain what's needed to sell on Trendz.`,
    },
    SUSPENDED: {
      icon: <ShieldAlertIcon className="size-10 text-destructive" />,
      title: `${seller.shopName} is suspended`,
      text: `Your listings are hidden from buyers. Contact us at ${site.supportEmail} to resolve it.`,
    },
  }[seller.status];

  return (
    <div className="flex flex-col items-center rounded-3xl border p-10 text-center">
      {content.icon}
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{content.title}</h1>
      <p className="mt-3 text-muted-foreground">{content.text}</p>
      <Button asChild variant="outline" className="mt-8">
        <Link href="/">Back to the store</Link>
      </Button>
    </div>
  );
}
