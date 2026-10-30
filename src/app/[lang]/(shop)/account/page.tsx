import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { MapPinIcon, PackageIcon } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { type Lang, localizePath } from "@/i18n/config";
import { getDict, langOf } from "@/i18n";
import { requireSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/[lang]/account">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).account.myAccount, robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const lang = await langOf(params);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{getDict(lang).account.myAccount}</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-secondary" />}>
        <AccountDetails lang={lang} />
      </Suspense>
    </div>
  );
}

async function AccountDetails({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const { user } = await requireSession(localizePath("/account", lang));
  const hasRealEmail = !user.email.endsWith("@phone.trendz.invalid");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            {hasRealEmail && <p className="text-sm text-muted-foreground">{user.email}</p>}
            {user.phoneNumber && user.phoneNumber !== user.name && (
              <p className="text-sm text-muted-foreground">{user.phoneNumber}</p>
            )}
          </div>
          <Badge variant="secondary">{user.role ?? "BUYER"}</Badge>
        </div>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <AccountLink href="/account/orders" icon={<PackageIcon />} title={t.account.myOrders} text={t.account.ordersHint} />
        <AccountLink href="/account/addresses" icon={<MapPinIcon />} title={t.account.addresses} text={t.account.addressesHint} />
      </div>
    </div>
  );
}

function AccountLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl border p-6 transition hover:border-primary/40">
      <span className="text-primary [&_svg]:size-6">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </Link>
  );
}
