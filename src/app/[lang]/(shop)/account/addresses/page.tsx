import type { Metadata } from "next";
import { Suspense } from "react";
import { AddressLines } from "@/components/account/address-card";
import { AddressBook } from "@/components/account/address-book";
import { Breadcrumbs } from "@/components/listing/breadcrumbs";
import { type Lang, localizePath } from "@/i18n/config";
import { getDict, langOf } from "@/i18n";
import { listAddresses } from "@/lib/addresses";
import { requireSession } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/[lang]/account/addresses">): Promise<Metadata> {
  return { title: getDict(await langOf(params)).address.title, robots: { index: false } };
}

export default async function AddressesPage({ params }: PageProps<"/[lang]/account/addresses">) {
  const lang = await langOf(params);
  const t = getDict(lang);
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs items={[{ label: t.account.myAccount, href: "/account" }, { label: t.account.addresses }]} />
      <h1 className="text-3xl font-semibold tracking-tight">{t.address.title}</h1>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-secondary" />}>
        <Addresses lang={lang} />
      </Suspense>
    </div>
  );
}

async function Addresses({ lang }: { lang: Lang }) {
  const { user } = await requireSession(localizePath("/account/addresses", lang));
  const addresses = await listAddresses(user.id);
  return (
    <AddressBook
      addresses={addresses.map((a) => ({ id: a.id, isDefault: a.isDefault, lines: <AddressLines address={a} t={getDict(lang)} /> }))}
    />
  );
}
