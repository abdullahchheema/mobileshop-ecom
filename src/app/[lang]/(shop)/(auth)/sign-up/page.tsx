import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getDict, langOf } from "@/i18n";
import { alternatesFor } from "@/i18n/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/sign-up">): Promise<Metadata> {
  const lang = await langOf(params);
  return { title: getDict(lang).auth.create, robots: { index: false }, alternates: alternatesFor("/sign-up", lang) };
}

export default async function SignUpPage({ params }: PageProps<"/[lang]/sign-up">) {
  const t = getDict(await langOf(params));
  return (
    <AuthCard title={t.auth.createTitle} subtitle={t.auth.createSubtitle}>
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthCard>
  );
}
