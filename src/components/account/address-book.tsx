"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/addresses";
import { AddressForm } from "@/components/account/address-form";
import { useI18n } from "@/components/i18n/lang-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Item = { id: string; isDefault: boolean; lines: React.ReactNode };

export function AddressBook({ addresses }: { addresses: Item[] }) {
  const [adding, setAdding] = useState(addresses.length === 0);
  const [pending, start] = useTransition();
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <ul className={`grid gap-3 sm:grid-cols-2 ${pending ? "opacity-60" : ""}`}>
        {addresses.map((a) => (
          <li key={a.id} className="flex flex-col justify-between gap-4 rounded-2xl border p-5">
            <div className="flex items-start justify-between gap-3">
              {a.lines}
              {a.isDefault && <Badge>{t.address.default}</Badge>}
            </div>
            <div className="flex gap-1">
              {!a.isDefault && (
                <Button variant="outline" size="sm" disabled={pending} onClick={() => start(() => setDefaultAddressAction(a.id))}>
                  {t.address.makeDefaultButton}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => start(() => deleteAddressAction(a.id))}
              >
                {t.address.delete}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-2xl border p-5">
          <h2 className="mb-4 font-semibold">{t.address.newTitle}</h2>
          <AddressForm
            onSaved={() => setAdding(false)}
            onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
          />
        </div>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)}>
          <PlusIcon data-icon="inline-start" /> {t.address.add}
        </Button>
      )}
    </div>
  );
}
