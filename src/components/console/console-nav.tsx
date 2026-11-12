"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknoteIcon,
  FolderTreeIcon,
  ImageIcon,
  LayoutDashboardIcon,
  ListIcon,
  PackageIcon,
  RefreshCwIcon,
  SmartphoneIcon,
  StoreIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icons are referenced by name so server layouts can pass plain data.
const ICONS = {
  dashboard: LayoutDashboardIcon,
  listings: ListIcon,
  orders: PackageIcon,
  payouts: BanknoteIcon,
  shop: StoreIcon,
  sellers: UsersIcon,
  returns: Undo2Icon,
  products: SmartphoneIcon,
  categories: FolderTreeIcon,
  banners: ImageIcon,
  sync: RefreshCwIcon,
};

export type ConsoleNavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

type Props = { items: ConsoleNavItem[]; orientation: "vertical" | "horizontal" };

/** Highlights the current page. Reads the URL, so render it inside <Suspense> with ConsoleNavLinks as the fallback. */
export function ConsoleNav(props: Props) {
  return <ConsoleNavLinks {...props} pathname={usePathname()} />;
}

export function ConsoleNavLinks({ items, orientation, pathname }: Props & { pathname: string | null }) {
  return (
    <nav className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "overflow-x-auto py-1.5 scrollbar-none")}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname !== null && (item.exact ? pathname === item.href : pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition",
              active ? "bg-accent text-accent-foreground" : "text-foreground/75 hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="size-4.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
