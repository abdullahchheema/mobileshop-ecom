"use client";

import { LogOutIcon } from "lucide-react";
import { useI18n } from "@/components/i18n/lang-provider";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/navigate-after-auth";

export function SignOutButton() {
  const { t, href } = useI18n();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await signOut();
        navigateAfterAuth(href("/"));
      }}
    >
      <LogOutIcon data-icon="inline-start" /> {t.account.signOut}
    </Button>
  );
}
