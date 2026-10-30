"use client";

import { startTransition, useActionState } from "react";
import Link from "next/link";
import { type ApplicationState, applyAsSellerAction } from "@/app/actions/sellers";
import { Field, FieldError } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SellerApplicationForm() {
  const [state, formAction, pending] = useActionState<ApplicationState, FormData>(applyAsSellerAction, { status: "idle" });
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form
      method="post"
      // onSubmit keeps typed values when validation fails (the `action` prop would reset them).
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="space-y-8"
      noValidate
    >
      <Section title="Your shop" text="This is what buyers see next to your listings.">
        <Field label="Shop name" name="shopName" error={errors.shopName} placeholder="e.g. Lahore Mobile Renew" />
        <Field label="City" name="city" error={errors.city} autoComplete="address-level2" />
        <Field
          label="Business mobile number"
          name="phone"
          error={errors.phone}
          type="tel"
          inputMode="tel"
          placeholder="0300 1234567"
          hint="We send order alerts here."
        />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">About your shop (optional)</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            placeholder="How long you've been refurbishing, what you specialise in…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </Section>

      <Section title="Verification" text="Required by law for marketplace sellers. Never shown to buyers.">
        <Field
          label="CNIC"
          name="cnic"
          error={errors.cnic}
          inputMode="numeric"
          placeholder="35202-1234567-1"
        />
        <Field label="NTN (optional)" name="ntn" error={errors.ntn} hint="If your business is registered with FBR." />
      </Section>

      <Section title="Payouts" text="Where we send your earnings every week.">
        <Field label="Bank" name="bankName" error={errors.bankName} placeholder="e.g. Meezan Bank" />
        <Field label="Account title" name="accountTitle" error={errors.accountTitle} />
        <Field
          label="IBAN"
          name="iban"
          error={errors.iban}
          placeholder="PK36 SCBL 0000 0011 2345 6702"
          className="sm:col-span-2"
        />
      </Section>

      <div className="space-y-2">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 size-4 accent-[var(--primary)]" />
          <span>
            I agree to the{" "}
            <Link href="/sell#standards" className="font-medium text-primary underline" target="_blank">
              Trendz seller quality standards
            </Link>
            : honest grading, a full inspection and data wipe, at least a 12-month warranty, and shipping within 2
            working days.
          </span>
        </label>
        <FieldError messages={errors.agree} />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 px-8 text-base" disabled={pending}>
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}

function Section({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border p-5 md:p-6">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      <p className="mb-5 text-sm text-muted-foreground">{text}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
