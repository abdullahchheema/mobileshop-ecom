"use client";

import Link from "@/components/i18n/link";
import { LayoutDashboardIcon, LogOutIcon, PackageIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/i18n/lang-provider";
import { signOut } from "@/lib/auth-client";
import { navigateAfterAuth } from "@/lib/navigate-after-auth";

type Props = { name: string; contact: string; role: string };

export function UserMenuDropdown({ name, contact, role }: Props) {
  const { t, href } = useI18n();

  async function handleSignOut() {
    await signOut();
    navigateAfterAuth(href("/"));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="lg" className="gap-2 px-2.5" aria-label={t.account.menu}>
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {name.replace(/[^\p{L}\p{N}]/gu, "").charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">{name.split(" ")[0]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-semibold text-foreground">{name}</span>
          {contact !== name && <span className="truncate text-xs font-normal">{contact}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserIcon /> {t.account.myAccount}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <PackageIcon /> {t.account.myOrders}
          </Link>
        </DropdownMenuItem>
        {role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <LayoutDashboardIcon /> {t.account.admin}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          <LogOutIcon /> {t.account.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
