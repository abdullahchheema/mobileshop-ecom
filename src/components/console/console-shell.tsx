import { Suspense } from "react";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { ConsoleNav, type ConsoleNavItem, ConsoleNavLinks } from "@/components/console/console-nav";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";

/** Layout for the seller hub and admin panel: top bar, side nav (tabs on mobile), content. */
export function ConsoleShell({
  label,
  nav,
  children,
}: {
  label: string;
  nav: ConsoleNavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary/40">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="flex items-center gap-3 px-4 py-3">
          <Logo />
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-semibold text-white">{label}</span>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-secondary sm:flex"
            >
              View store <ExternalLinkIcon className="size-3.5" />
            </Link>
            <Suspense fallback={<div className="mx-2 size-7 animate-pulse rounded-full bg-secondary" />}>
              <UserMenu />
            </Suspense>
          </div>
        </div>
        <div className="border-t px-2 lg:hidden">
          <Suspense fallback={<ConsoleNavLinks items={nav} orientation="horizontal" pathname={null} />}>
            <ConsoleNav items={nav} orientation="horizontal" />
          </Suspense>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r bg-background p-3 lg:block">
          <div className="sticky top-20">
            <Suspense fallback={<ConsoleNavLinks items={nav} orientation="vertical" pathname={null} />}>
              <ConsoleNav items={nav} orientation="vertical" />
            </Suspense>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
