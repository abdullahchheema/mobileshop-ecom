import { DM_Sans, Geist_Mono, Noto_Naskh_Arabic } from "next/font/google";

// Shared by every root layout.

export const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

/**
 * Urdu text. Naskh stays compact enough for interface copy, unlike Nastaliq's tall lines.
 * Not preloaded: only Urdu pages use it, so English visitors never download it.
 */
export const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const fontVariables = `${dmSans.variable} ${geistMono.variable} ${naskh.variable}`;
