// Maps Banner.theme keys stored in the database to brand surface classes.
const themes: Record<string, string> = {
  lime: "bg-lime",
  lilac: "bg-lilac",
  mint: "bg-mint",
  mango: "bg-mango",
  sky: "bg-sky",
  blush: "bg-blush",
};

export const BANNER_THEMES = ["lime", "lilac", "mint", "mango", "sky", "blush"] as const;

export const bannerThemeClass = (theme: string) => themes[theme] ?? themes.lime;
