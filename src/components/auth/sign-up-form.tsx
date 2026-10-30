"use client";

import { useState } from "react";
import Link from "@/components/i18n/link";
import { useSearchParams } from "next/navigation";
import { FormError } from "@/components/auth/auth-card";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/navigate-after-auth";
import { safeRedirect } from "@/lib/safe-redirect";

export function SignUpForm() {
  const { t, href } = useI18n();
  const next = safeRedirect(useSearchParams().get("next"), href("/"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(error.message ?? t.auth.createFailed);
    navigateAfterAuth(next);
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t.auth.name}</Label>
        <Input id="name" name="name" autoComplete="name" className="h-11" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" className="h-11" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="h-11"
          required
        />
        <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? t.auth.creating : t.auth.create}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.haveAccount}{" "}
        <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          {t.auth.signIn}
        </Link>
      </p>
    </form>
  );
}
