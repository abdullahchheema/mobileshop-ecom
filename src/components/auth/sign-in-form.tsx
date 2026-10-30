"use client";

import { useState } from "react";
import Link from "@/components/i18n/link";
import { useSearchParams } from "next/navigation";
import { FormError } from "@/components/auth/auth-card";
import { useI18n } from "@/components/i18n/lang-provider";
import { ltr } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient, signIn } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/navigate-after-auth";
import { normalizePkMobile } from "@/lib/phone";
import { safeRedirect } from "@/lib/safe-redirect";

export function SignInForm() {
  const { t, href } = useI18n();
  const next = safeRedirect(useSearchParams().get("next"), href("/"));

  return (
    <Tabs defaultValue="phone">
      <TabsList className="mb-6 w-full">
        <TabsTrigger value="phone">{t.auth.mobileTab}</TabsTrigger>
        <TabsTrigger value="email">{t.auth.emailTab}</TabsTrigger>
      </TabsList>
      <TabsContent value="phone">
        <PhoneSignIn next={next} />
      </TabsContent>
      <TabsContent value="email">
        <EmailSignIn next={next} />
      </TabsContent>
    </Tabs>
  );
}

function useFinishSignIn(next: string) {
  return () => navigateAfterAuth(next);
}

function PhoneSignIn({ next }: { next: string }) {
  const finish = useFinishSignIn(next);
  const { t } = useI18n();
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const phoneNumber = normalizePkMobile(phone);
    if (!phoneNumber) return setError(t.auth.invalidPhone);

    setPending(true);
    setError(null);
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber });
    setPending(false);
    if (error) return setError(error.message ?? t.auth.sendFailed);
    setSentTo(phoneNumber);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setPending(true);
    setError(null);
    const { error } = await authClient.phoneNumber.verify({ phoneNumber: sentTo, code: code.trim() });
    setPending(false);
    if (error) return setError(error.message ?? t.auth.codeFailed);
    finish();
  }

  if (!sentTo) {
    return (
      <form method="post" onSubmit={sendCode} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t.auth.mobile}</Label>
          {/* Phone numbers read left to right in Urdu too. */}
          <div className="flex" dir="ltr">
            <span className="flex items-center rounded-l-lg border border-r-0 bg-secondary px-3 text-sm text-muted-foreground">
              +92
            </span>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="300 1234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 rounded-l-none"
              required
            />
          </div>
        </div>
        <FormError message={error} />
        <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
          {pending ? t.auth.sendingCode : t.auth.sendCode}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t.auth.newHere}</p>
      </form>
    );
  }

  return (
    <form method="post" onSubmit={verifyCode} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">{t.auth.enterCode(ltr(sentTo))}</Label>
        <Input
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="h-11 text-center text-lg tracking-[0.5em]"
          autoFocus
          required
        />
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || code.length !== 6}>
        {pending ? t.auth.verifying : t.auth.verify}
      </Button>
      <Button
        type="button"
        variant="link"
        className="w-full"
        onClick={() => {
          setSentTo(null);
          setCode("");
          setError(null);
        }}
      >
        {t.auth.otherNumber}
      </Button>
    </form>
  );
}

function EmailSignIn({ next }: { next: string }) {
  const finish = useFinishSignIn(next);
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(error.message ?? t.auth.wrongPassword);
    finish();
  }

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t.auth.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" className="h-11" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t.auth.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" className="h-11" required />
      </div>
      <FormError message={error} />
      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? t.auth.signingIn : t.auth.signIn}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold text-primary hover:underline">
          {t.auth.createOne}
        </Link>
      </p>
    </form>
  );
}
