import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-in">): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getDict(lang).auth.signIn, robots: { index: false }, alternates: alternatesFor("/sign-in", lang) };
}

export default async function SignInPage({ params }: PageProps<"/[lang]/sign-in">) {
  const t = getDict(await langOf(params));
  return (
    <AuthCard title={t.auth.welcome} subtitle={t.auth.signInSubtitle}>
      {/* The form reads ?next= from the URL, which is request-time data. */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthCard>
  );
}
