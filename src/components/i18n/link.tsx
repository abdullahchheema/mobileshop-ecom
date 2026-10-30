"use client";

import NextLink from "next/link";
import { useI18n } from "@/components/i18n/lang-provider";

/**
 * next/link that keeps visitors in their language: "/cart" becomes "/ur/cart"
 * on Urdu pages. Use it for storefront links instead of next/link.
 */
export default function Link({ href, ...props }: React.ComponentProps<typeof NextLink>) {
  const { href: localize } = useI18n();
  return <NextLink href={typeof href === "string" ? localize(href) : href} {...props} />;
}
