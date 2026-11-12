// Home page banners. With no admin dashboard these are fixed content in code (the ERP owns stock and prices, never copy).
// Do not put prices here: they would go stale; prices come from the ERP.

export type Banner = {
  id: string;
  placement: "HOME_HERO" | "HOME_PROMO";
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  titleUr: string | null;
  subtitleUr: string | null;
  ctaLabelUr: string | null;
  ctaHref: string | null;
  image: string | null;
  theme: string;
  sortOrder: number;
};

export const BANNERS: Banner[] = [
  {
    id: "hero",
    placement: "HOME_HERO",
    title: "Flagship phones. Refurbished. Way less.",
    subtitle: "Checked by experts, backed by a 12-month warranty, delivered anywhere in Pakistan.",
    ctaLabel: "See today's deals",
    titleUr: "فلیگ شپ فونز۔ ری فربشڈ۔ کہیں کم قیمت میں۔",
    subtitleUr: "ماہرین سے چیک شدہ، 12 ماہ کی وارنٹی کے ساتھ، پاکستان میں کہیں بھی ڈیلیوری۔",
    ctaLabelUr: "آج کی ڈیلز دیکھیں",
    ctaHref: "/deals",
    image: null,
    theme: "lime",
    sortOrder: 0,
  },
  {
    id: "promo-deals",
    placement: "HOME_PROMO",
    title: "Half the price of new",
    subtitle: "Same phone, checked and warrantied. See what's discounted right now.",
    ctaLabel: "See deals",
    titleUr: "نئے کی آدھی قیمت",
    subtitleUr: "وہی فون، چیک شدہ اور وارنٹی کے ساتھ۔ دیکھیں اس وقت کیا ڈسکاؤنٹ پر ہے۔",
    ctaLabelUr: "ڈیلز دیکھیں",
    ctaHref: "/deals",
    image: null,
    theme: "lilac",
    sortOrder: 0,
  },
  {
    id: "promo-cod",
    placement: "HOME_PROMO",
    title: "Pay cash on delivery",
    subtitle: "Check your device at your door, then pay. Available nationwide.",
    ctaLabel: "How it works",
    titleUr: "کیش آن ڈیلیوری",
    subtitleUr: "اپنے دروازے پر ڈیوائس چیک کریں، پھر ادائیگی کریں۔ پورے ملک میں دستیاب۔",
    ctaLabelUr: "یہ کیسے کام کرتا ہے",
    ctaHref: "/help/cash-on-delivery",
    image: null,
    theme: "sky",
    sortOrder: 1,
  },
];
