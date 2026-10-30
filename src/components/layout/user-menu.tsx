import { UserIcon } from "lucide-react";
import Link from "@/components/i18n/link";
import { UserMenuDropdown } from "@/components/layout/user-menu-dropdown";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/config";
import { getDict } from "@/i18n";
import { getSession } from "@/lib/session";

/** Reads the session, so it must render inside <Suspense> (see Header). */
export async function UserMenu({ lang = "en" }: { lang?: Lang }) {
  const session = await getSession();
  if (!session) return <SignInButton lang={lang} />;

  const { name, email, phoneNumber, role } = session.user;
  // Phone-only accounts carry a placeholder email; show the phone number instead.
  const contact = email.endsWith("@phone.trendz.invalid") ? phoneNumber : email;
  return <UserMenuDropdown name={name} contact={contact ?? ""} role={role ?? "BUYER"} />;
}

export function SignInButton({ lang = "en" }: { lang?: Lang }) {
  return (
    <Button asChild variant="ghost" size="lg" className="gap-2 px-2.5">
      <Link href="/sign-in">
        <UserIcon className="size-5" />
        <span className="hidden lg:inline">{getDict(lang).header.signIn}</span>
      </Link>
    </Button>
  );
}
