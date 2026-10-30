"use client";

import { startTransition, useActionState, useEffect, useId, useState } from "react";
import { type AddressFormState, createAddressAction } from "@/app/actions/addresses";
import { Field, FieldError } from "@/components/form/field";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CITIES, PROVINCES } from "@/lib/pakistan";

export function AddressForm({
  onSaved,
  onCancel,
  showDefaultToggle = true,
}: {
  onSaved?: (addressId: string) => void;
  onCancel?: () => void;
  showDefaultToggle?: boolean;
}) {
  const [state, formAction, pending] = useActionState<AddressFormState, FormData>(createAddressAction, { status: "idle" });
  const [province, setProvince] = useState("");
  const { t } = useI18n();
  const cityList = useId();
  const errors = state.status === "error" ? state.fieldErrors : {};

  useEffect(() => {
    if (state.status === "saved") onSaved?.(state.addressId);
  }, [state, onSaved]);

  return (
    <form
      method="post"
      // Submitting via onSubmit (not the `action` prop) stops React from clearing
      // the fields when validation fails.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <Field label={t.address.fullName} name="fullName" error={errors.fullName} autoComplete="name" />
      <Field
        label={t.address.phone}
        name="phone"
        error={errors.phone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="0300 1234567"
      />
      <Field
        label={t.address.line1}
        name="line1"
        error={errors.line1}
        autoComplete="address-line1"
        placeholder={t.address.line1Placeholder}
        className="sm:col-span-2"
      />
      <Field
        label={t.address.line2}
        name="line2"
        error={errors.line2}
        autoComplete="address-line2"
        placeholder={t.address.line2Placeholder}
        className="sm:col-span-2"
      />
      <Field
        label={t.address.city}
        name="city"
        error={errors.city}
        autoComplete="address-level2"
        list={cityList}
        onChange={(e) => {
          const match = CITIES.find((c) => c.name.toLowerCase() === e.target.value.trim().toLowerCase());
          if (match) setProvince(match.province);
        }}
      />
      <datalist id={cityList}>
        {CITIES.map((c) => (
          <option key={c.name} value={c.name} />
        ))}
      </datalist>

      <div className="space-y-2">
        <Label htmlFor="province">{t.address.province}</Label>
        <select
          id="province"
          name="province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          aria-invalid={Boolean(errors.province)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm aria-invalid:border-destructive"
        >
          <option value="" disabled>
            {t.address.chooseProvince}
          </option>
          {PROVINCES.map((p) => (
            <option key={p.value} value={p.value}>
              {t.address.provinces[p.value] ?? p.label}
            </option>
          ))}
        </select>
        <FieldError messages={errors.province} />
      </div>

      <Field
        label={t.address.postal}
        name="postalCode"
        error={errors.postalCode}
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={5}
      />

      {showDefaultToggle && (
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" name="isDefault" className="size-4 accent-[var(--primary)]" />
          {t.address.makeDefault}
        </label>
      )}

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {state.message}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.address.saving : t.address.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
