// Demo catalog for local development. Prices are rough PKR estimates.

export type Swatch = { label: string; hex: string };

export type SeedCategory = {
  name: string;
  slug: string;
  icon: string;
  featured?: boolean;
  children?: { name: string; slug: string }[];
};

export type SeedProduct = {
  name: string;
  slug: string;
  brand: string;
  category: string;
  releaseYear: number;
  newPrice: number;
  /// Lowest price: Fair condition, first size option, PTA approved.
  basePrice: number;
  /// The size-like picker: storage for most devices, case size / edition otherwise.
  size: { type: "STORAGE" | "OTHER"; name: string; values: string[] };
  colors: Swatch[];
  /// Phones get a PTA status picker (approved vs non-PTA).
  pta?: boolean;
  specs: Record<string, string>;
};

export const CATEGORIES: SeedCategory[] = [
  {
    name: "Smartphones",
    slug: "smartphones",
    icon: "smartphone",
    featured: true,
    children: [
      { name: "iPhone", slug: "iphone" },
      { name: "Samsung Galaxy", slug: "samsung-galaxy" },
      { name: "Google Pixel", slug: "google-pixel" },
      { name: "Xiaomi", slug: "xiaomi" },
      { name: "OnePlus", slug: "oneplus" },
    ],
  },
  {
    name: "Laptops",
    slug: "laptops",
    icon: "laptop",
    featured: true,
    children: [
      { name: "MacBook", slug: "macbook" },
      { name: "Windows laptops", slug: "windows-laptops" },
    ],
  },
  {
    name: "Tablets",
    slug: "tablets",
    icon: "tablet",
    featured: true,
    children: [
      { name: "iPad", slug: "ipad" },
      { name: "Android tablets", slug: "android-tablets" },
    ],
  },
  {
    name: "Smartwatches",
    slug: "smartwatches",
    icon: "watch",
    featured: true,
    children: [
      { name: "Apple Watch", slug: "apple-watch" },
      { name: "Galaxy Watch", slug: "galaxy-watch" },
    ],
  },
  {
    name: "Audio",
    slug: "audio",
    icon: "headphones",
    featured: true,
    children: [
      { name: "AirPods", slug: "airpods" },
      { name: "Headphones", slug: "headphones" },
    ],
  },
  {
    name: "Gaming",
    slug: "gaming",
    icon: "gamepad",
    featured: true,
    children: [{ name: "Consoles", slug: "consoles" }],
  },
];

export const BRANDS = [
  "Apple",
  "Samsung",
  "Google",
  "Xiaomi",
  "OnePlus",
  "Dell",
  "Lenovo",
  "HP",
  "Sony",
  "Nintendo",
  "Microsoft",
];

export const CONDITIONS = [
  { label: "Fair", value: "fair", multiplier: 1 },
  { label: "Good", value: "good", multiplier: 1.07 },
  { label: "Excellent", value: "excellent", multiplier: 1.15 },
  { label: "Premium", value: "premium", multiplier: 1.3 },
];

export const PTA_STATUSES = [
  { label: "PTA approved", value: "pta-approved", multiplier: 1 },
  { label: "Non-PTA", value: "non-pta", multiplier: 0.82 },
];

const black = { label: "Black", hex: "#2f2f31" };
const white = { label: "White", hex: "#f4f3ef" };
const silver = { label: "Silver", hex: "#d7d8da" };
const spaceGray = { label: "Space Gray", hex: "#6e6e73" };
const midnight = { label: "Midnight", hex: "#2e3642" };
const starlight = { label: "Starlight", hex: "#f0e5d3" };
const titanium = [
  { label: "Natural Titanium", hex: "#c2bcb2" },
  { label: "White Titanium", hex: "#f2f1ec" },
  { label: "Black Titanium", hex: "#3c3c3d" },
];

const phoneStorage = (...values: string[]) => ({ type: "STORAGE" as const, name: "Storage", values });

export const PRODUCTS: SeedProduct[] = [
  // ── iPhone
  {
    name: "iPhone 16 Pro Max", slug: "iphone-16-pro-max", brand: "Apple", category: "iphone",
    releaseYear: 2024, newPrice: 520000, basePrice: 330000, pta: true,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [{ label: "Desert Titanium", hex: "#bfa48f" }, ...titanium],
    specs: { Display: "6.9-inch Super Retina XDR", Chip: "A18 Pro", Camera: "48 MP triple", "5G": "Yes" },
  },
  {
    name: "iPhone 16 Pro", slug: "iphone-16-pro", brand: "Apple", category: "iphone",
    releaseYear: 2024, newPrice: 450000, basePrice: 285000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Desert Titanium", hex: "#bfa48f" }, ...titanium],
    specs: { Display: "6.3-inch Super Retina XDR", Chip: "A18 Pro", Camera: "48 MP triple", "5G": "Yes" },
  },
  {
    name: "iPhone 16", slug: "iphone-16", brand: "Apple", category: "iphone",
    releaseYear: 2024, newPrice: 330000, basePrice: 215000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Ultramarine", hex: "#6c7bd8" }, { label: "Teal", hex: "#a3c9c2" }, { label: "Pink", hex: "#f2adda" }, black],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A18", Camera: "48 MP dual", "5G": "Yes" },
  },
  {
    name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", brand: "Apple", category: "iphone",
    releaseYear: 2023, newPrice: 470000, basePrice: 255000, pta: true,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [{ label: "Blue Titanium", hex: "#3f4a5a" }, ...titanium],
    specs: { Display: "6.7-inch Super Retina XDR", Chip: "A17 Pro", Camera: "48 MP triple", "5G": "Yes" },
  },
  {
    name: "iPhone 15 Pro", slug: "iphone-15-pro", brand: "Apple", category: "iphone",
    releaseYear: 2023, newPrice: 400000, basePrice: 215000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Blue Titanium", hex: "#3f4a5a" }, ...titanium],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A17 Pro", Camera: "48 MP triple", "5G": "Yes" },
  },
  {
    name: "iPhone 15", slug: "iphone-15", brand: "Apple", category: "iphone",
    releaseYear: 2023, newPrice: 290000, basePrice: 165000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Pink", hex: "#f5d3d9" }, { label: "Yellow", hex: "#f4e8b8" }, { label: "Green", hex: "#cad4c5" }, { label: "Blue", hex: "#ced5dd" }, black],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A16 Bionic", Camera: "48 MP dual", "5G": "Yes" },
  },
  {
    name: "iPhone 14", slug: "iphone-14", brand: "Apple", category: "iphone",
    releaseYear: 2022, newPrice: 250000, basePrice: 125000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [midnight, starlight, { label: "Blue", hex: "#a0b4c7" }, { label: "Purple", hex: "#e5ddea" }, { label: "Red", hex: "#c8242e" }],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A15 Bionic", Camera: "12 MP dual", "5G": "Yes" },
  },
  {
    name: "iPhone 13", slug: "iphone-13", brand: "Apple", category: "iphone",
    releaseYear: 2021, newPrice: 230000, basePrice: 105000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [midnight, starlight, { label: "Blue", hex: "#3b5f7d" }, { label: "Pink", hex: "#f8d9d4" }],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A15 Bionic", Camera: "12 MP dual", "5G": "Yes" },
  },
  {
    name: "iPhone 12", slug: "iphone-12", brand: "Apple", category: "iphone",
    releaseYear: 2020, newPrice: 200000, basePrice: 78000, pta: true,
    size: phoneStorage("64 GB", "128 GB", "256 GB"),
    colors: [black, white, { label: "Blue", hex: "#2c4a6b" }, { label: "Green", hex: "#d8eadb" }],
    specs: { Display: "6.1-inch Super Retina XDR", Chip: "A14 Bionic", Camera: "12 MP dual", "5G": "Yes" },
  },
  {
    name: "iPhone 11", slug: "iphone-11", brand: "Apple", category: "iphone",
    releaseYear: 2019, newPrice: 170000, basePrice: 60000, pta: true,
    size: phoneStorage("64 GB", "128 GB", "256 GB"),
    colors: [black, white, { label: "Purple", hex: "#d1cdda" }, { label: "Red", hex: "#ba0c2e" }],
    specs: { Display: "6.1-inch Liquid Retina", Chip: "A13 Bionic", Camera: "12 MP dual", "5G": "No" },
  },
  {
    name: "iPhone SE (2022)", slug: "iphone-se-2022", brand: "Apple", category: "iphone",
    releaseYear: 2022, newPrice: 130000, basePrice: 45000, pta: true,
    size: phoneStorage("64 GB", "128 GB", "256 GB"),
    colors: [midnight, starlight, { label: "Red", hex: "#c8242e" }],
    specs: { Display: "4.7-inch Retina HD", Chip: "A15 Bionic", Camera: "12 MP", "5G": "Yes" },
  },
  // ── Samsung
  {
    name: "Galaxy S24 Ultra", slug: "galaxy-s24-ultra", brand: "Samsung", category: "samsung-galaxy",
    releaseYear: 2024, newPrice: 420000, basePrice: 255000, pta: true,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [{ label: "Titanium Gray", hex: "#8d8a86" }, { label: "Titanium Black", hex: "#3a3a3c" }, { label: "Titanium Violet", hex: "#cbb9d9" }, { label: "Titanium Yellow", hex: "#f2e4a6" }],
    specs: { Display: "6.8-inch Dynamic AMOLED 2X", Chip: "Snapdragon 8 Gen 3", Camera: "200 MP quad", "5G": "Yes" },
  },
  {
    name: "Galaxy S24", slug: "galaxy-s24", brand: "Samsung", category: "samsung-galaxy",
    releaseYear: 2024, newPrice: 275000, basePrice: 150000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Onyx Black", hex: "#2b2b2d" }, { label: "Marble Gray", hex: "#c9c8c6" }, { label: "Cobalt Violet", hex: "#a99ad1" }, { label: "Amber Yellow", hex: "#f1dc8e" }],
    specs: { Display: "6.2-inch Dynamic AMOLED 2X", Chip: "Exynos 2400", Camera: "50 MP triple", "5G": "Yes" },
  },
  {
    name: "Galaxy S23 Ultra", slug: "galaxy-s23-ultra", brand: "Samsung", category: "samsung-galaxy",
    releaseYear: 2023, newPrice: 380000, basePrice: 180000, pta: true,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [{ label: "Phantom Black", hex: "#2d2d2f" }, { label: "Cream", hex: "#ede6d6" }, { label: "Green", hex: "#5d6e5c" }, { label: "Lavender", hex: "#d9cde6" }],
    specs: { Display: "6.8-inch Dynamic AMOLED 2X", Chip: "Snapdragon 8 Gen 2", Camera: "200 MP quad", "5G": "Yes" },
  },
  {
    name: "Galaxy Z Flip5", slug: "galaxy-z-flip5", brand: "Samsung", category: "samsung-galaxy",
    releaseYear: 2023, newPrice: 300000, basePrice: 140000, pta: true,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [{ label: "Mint", hex: "#cfe8d6" }, { label: "Graphite", hex: "#4a4a4c" }, { label: "Cream", hex: "#ede6d6" }, { label: "Lavender", hex: "#d9cde6" }],
    specs: { Display: "6.7-inch foldable AMOLED", Chip: "Snapdragon 8 Gen 2", Camera: "12 MP dual", "5G": "Yes" },
  },
  {
    name: "Galaxy A55", slug: "galaxy-a55", brand: "Samsung", category: "samsung-galaxy",
    releaseYear: 2024, newPrice: 125000, basePrice: 70000, pta: true,
    size: phoneStorage("128 GB", "256 GB"),
    colors: [{ label: "Awesome Navy", hex: "#2d3a55" }, { label: "Awesome Iceblue", hex: "#c7dbea" }, { label: "Awesome Lilac", hex: "#d9c9e6" }],
    specs: { Display: "6.6-inch Super AMOLED", Chip: "Exynos 1480", Camera: "50 MP triple", "5G": "Yes" },
  },
  // ── Google / Xiaomi / OnePlus
  {
    name: "Pixel 9 Pro", slug: "pixel-9-pro", brand: "Google", category: "google-pixel",
    releaseYear: 2024, newPrice: 340000, basePrice: 190000, pta: true,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [{ label: "Obsidian", hex: "#2e2e30" }, { label: "Porcelain", hex: "#efe9df" }, { label: "Hazel", hex: "#8f9a8a" }, { label: "Rose Quartz", hex: "#f2cfd0" }],
    specs: { Display: "6.3-inch Super Actua", Chip: "Google Tensor G4", Camera: "50 MP triple", "5G": "Yes" },
  },
  {
    name: "Pixel 8", slug: "pixel-8", brand: "Google", category: "google-pixel",
    releaseYear: 2023, newPrice: 210000, basePrice: 95000, pta: true,
    size: phoneStorage("128 GB", "256 GB"),
    colors: [{ label: "Obsidian", hex: "#2e2e30" }, { label: "Hazel", hex: "#8f9a8a" }, { label: "Rose", hex: "#f2cfd0" }],
    specs: { Display: "6.2-inch Actua", Chip: "Google Tensor G3", Camera: "50 MP dual", "5G": "Yes" },
  },
  {
    name: "Xiaomi 14", slug: "xiaomi-14", brand: "Xiaomi", category: "xiaomi",
    releaseYear: 2024, newPrice: 230000, basePrice: 120000, pta: true,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [black, white, { label: "Jade Green", hex: "#a9c7b5" }],
    specs: { Display: "6.36-inch AMOLED", Chip: "Snapdragon 8 Gen 3", Camera: "50 MP Leica triple", "5G": "Yes" },
  },
  {
    name: "Redmi Note 13 Pro", slug: "redmi-note-13-pro", brand: "Xiaomi", category: "xiaomi",
    releaseYear: 2024, newPrice: 85000, basePrice: 48000, pta: true,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [{ label: "Midnight Black", hex: "#2a2a2c" }, { label: "Lavender Purple", hex: "#c8b8e0" }, { label: "Forest Green", hex: "#3f5a4a" }],
    specs: { Display: "6.67-inch AMOLED", Chip: "Helio G99-Ultra", Camera: "200 MP triple", "5G": "No" },
  },
  {
    name: "OnePlus 12", slug: "oneplus-12", brand: "OnePlus", category: "oneplus",
    releaseYear: 2024, newPrice: 250000, basePrice: 130000, pta: true,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [{ label: "Silky Black", hex: "#262628" }, { label: "Flowy Emerald", hex: "#3d6b5a" }],
    specs: { Display: "6.82-inch LTPO AMOLED", Chip: "Snapdragon 8 Gen 3", Camera: "50 MP triple", "5G": "Yes" },
  },
  // ── Laptops
  {
    name: "MacBook Air 13-inch M2", slug: "macbook-air-13-m2", brand: "Apple", category: "macbook",
    releaseYear: 2022, newPrice: 380000, basePrice: 210000,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [midnight, starlight, spaceGray, silver],
    specs: { Display: "13.6-inch Liquid Retina", Chip: "Apple M2", RAM: "8 GB", Battery: "Up to 18 hours" },
  },
  {
    name: "MacBook Air 13-inch M1", slug: "macbook-air-13-m1", brand: "Apple", category: "macbook",
    releaseYear: 2020, newPrice: 300000, basePrice: 150000,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [spaceGray, silver, { label: "Gold", hex: "#e8d5c0" }],
    specs: { Display: "13.3-inch Retina", Chip: "Apple M1", RAM: "8 GB", Battery: "Up to 18 hours" },
  },
  {
    name: "MacBook Pro 14-inch M3", slug: "macbook-pro-14-m3", brand: "Apple", category: "macbook",
    releaseYear: 2023, newPrice: 650000, basePrice: 390000,
    size: phoneStorage("512 GB", "1 TB"),
    colors: [{ label: "Space Black", hex: "#2c2c2e" }, silver],
    specs: { Display: "14.2-inch Liquid Retina XDR", Chip: "Apple M3", RAM: "8 GB", Battery: "Up to 22 hours" },
  },
  {
    name: "Dell XPS 13 9315", slug: "dell-xps-13-9315", brand: "Dell", category: "windows-laptops",
    releaseYear: 2022, newPrice: 320000, basePrice: 155000,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [{ label: "Sky", hex: "#d5dde3" }, { label: "Umber", hex: "#5b4f4a" }],
    specs: { Display: "13.4-inch FHD+", Processor: "Intel Core i5-1230U", RAM: "8 GB", OS: "Windows 11" },
  },
  {
    name: "ThinkPad X1 Carbon Gen 10", slug: "thinkpad-x1-carbon-gen-10", brand: "Lenovo", category: "windows-laptops",
    releaseYear: 2022, newPrice: 400000, basePrice: 170000,
    size: phoneStorage("256 GB", "512 GB", "1 TB"),
    colors: [black],
    specs: { Display: "14-inch WUXGA", Processor: "Intel Core i7-1260P", RAM: "16 GB", OS: "Windows 11 Pro" },
  },
  {
    name: "HP EliteBook 840 G8", slug: "hp-elitebook-840-g8", brand: "HP", category: "windows-laptops",
    releaseYear: 2021, newPrice: 260000, basePrice: 95000,
    size: phoneStorage("256 GB", "512 GB"),
    colors: [silver],
    specs: { Display: "14-inch FHD", Processor: "Intel Core i5-1145G7", RAM: "16 GB", OS: "Windows 11 Pro" },
  },
  // ── Tablets
  {
    name: "iPad Air 11-inch M2", slug: "ipad-air-11-m2", brand: "Apple", category: "ipad",
    releaseYear: 2024, newPrice: 230000, basePrice: 150000,
    size: phoneStorage("128 GB", "256 GB", "512 GB"),
    colors: [spaceGray, { label: "Blue", hex: "#a8bfd6" }, { label: "Purple", hex: "#d8cde6" }, starlight],
    specs: { Display: "11-inch Liquid Retina", Chip: "Apple M2", Connectivity: "Wi-Fi" },
  },
  {
    name: "iPad (10th generation)", slug: "ipad-10th-gen", brand: "Apple", category: "ipad",
    releaseYear: 2022, newPrice: 140000, basePrice: 85000,
    size: phoneStorage("64 GB", "256 GB"),
    colors: [silver, { label: "Blue", hex: "#7fa6c9" }, { label: "Pink", hex: "#f2b8c6" }, { label: "Yellow", hex: "#f5d76e" }],
    specs: { Display: "10.9-inch Liquid Retina", Chip: "A14 Bionic", Connectivity: "Wi-Fi" },
  },
  {
    name: "Galaxy Tab S9", slug: "galaxy-tab-s9", brand: "Samsung", category: "android-tablets",
    releaseYear: 2023, newPrice: 230000, basePrice: 120000,
    size: phoneStorage("128 GB", "256 GB"),
    colors: [{ label: "Graphite", hex: "#4a4a4c" }, { label: "Beige", hex: "#e6dccb" }],
    specs: { Display: "11-inch Dynamic AMOLED 2X", Chip: "Snapdragon 8 Gen 2", Connectivity: "Wi-Fi" },
  },
  // ── Watches
  {
    name: "Apple Watch Series 9", slug: "apple-watch-series-9", brand: "Apple", category: "apple-watch",
    releaseYear: 2023, newPrice: 130000, basePrice: 75000,
    size: { type: "OTHER", name: "Case size", values: ["41 mm", "45 mm"] },
    colors: [midnight, starlight, { label: "Pink", hex: "#f3d3d4" }, { label: "Red", hex: "#c8242e" }],
    specs: { Display: "Always-On Retina", Chip: "S9 SiP", Connectivity: "GPS" },
  },
  {
    name: "Apple Watch SE (2nd gen)", slug: "apple-watch-se-2", brand: "Apple", category: "apple-watch",
    releaseYear: 2022, newPrice: 80000, basePrice: 42000,
    size: { type: "OTHER", name: "Case size", values: ["40 mm", "44 mm"] },
    colors: [midnight, starlight, silver],
    specs: { Display: "Retina", Chip: "S8 SiP", Connectivity: "GPS" },
  },
  {
    name: "Galaxy Watch6", slug: "galaxy-watch6", brand: "Samsung", category: "galaxy-watch",
    releaseYear: 2023, newPrice: 75000, basePrice: 38000,
    size: { type: "OTHER", name: "Case size", values: ["40 mm", "44 mm"] },
    colors: [{ label: "Graphite", hex: "#4a4a4c" }, { label: "Gold", hex: "#e3cfae" }, silver],
    specs: { Display: "Super AMOLED", Connectivity: "Bluetooth" },
  },
  // ── Audio
  {
    name: "AirPods Pro (2nd gen)", slug: "airpods-pro-2", brand: "Apple", category: "airpods",
    releaseYear: 2023, newPrice: 70000, basePrice: 38000,
    size: { type: "OTHER", name: "Charging case", values: ["USB-C", "Lightning"] },
    colors: [white],
    specs: { "Noise cancelling": "Active", "Battery life": "Up to 6 hours" },
  },
  {
    name: "Sony WH-1000XM5", slug: "sony-wh-1000xm5", brand: "Sony", category: "headphones",
    releaseYear: 2022, newPrice: 110000, basePrice: 55000,
    size: { type: "OTHER", name: "Edition", values: ["Standard"] },
    colors: [black, silver],
    specs: { "Noise cancelling": "Active", "Battery life": "Up to 30 hours" },
  },
  // ── Gaming
  {
    name: "PlayStation 5 Slim", slug: "playstation-5-slim", brand: "Sony", category: "consoles",
    releaseYear: 2023, newPrice: 180000, basePrice: 120000,
    size: { type: "OTHER", name: "Edition", values: ["Digital", "Disc"] },
    colors: [white],
    specs: { Storage: "1 TB SSD", Resolution: "Up to 4K 120 Hz" },
  },
  {
    name: "Nintendo Switch OLED", slug: "nintendo-switch-oled", brand: "Nintendo", category: "consoles",
    releaseYear: 2021, newPrice: 110000, basePrice: 70000,
    size: { type: "STORAGE", name: "Storage", values: ["64 GB"] },
    colors: [white, { label: "Neon Red/Blue", hex: "#e4434b" }],
    specs: { Display: "7-inch OLED", Modes: "TV, tabletop, handheld" },
  },
  {
    name: "Xbox Series X", slug: "xbox-series-x", brand: "Microsoft", category: "consoles",
    releaseYear: 2020, newPrice: 170000, basePrice: 110000,
    size: { type: "STORAGE", name: "Storage", values: ["1 TB"] },
    colors: [black],
    specs: { Resolution: "Up to 4K 120 Hz", Drive: "Blu-ray disc" },
  },
];

export const SELLERS = [
  { shopName: "Lahore Refurb Hub", slug: "lahore-refurb-hub", city: "Lahore", status: "APPROVED" as const },
  { shopName: "Karachi Gadget Clinic", slug: "karachi-gadget-clinic", city: "Karachi", status: "APPROVED" as const },
  { shopName: "Capital Tech Renew", slug: "capital-tech-renew", city: "Islamabad", status: "APPROVED" as const },
  { shopName: "Peshawar Phone Doctor", slug: "peshawar-phone-doctor", city: "Peshawar", status: "PENDING" as const },
];

export const BANNERS = [
  {
    placement: "HOME_HERO" as const,
    title: "Flagship phones. Refurbished. Way less.",
    subtitle: "Checked by experts, backed by a 12-month warranty, delivered anywhere in Pakistan.",
    ctaLabel: "Shop phones",
    titleUr: "فلیگ شپ فونز۔ ری فربشڈ۔ کہیں کم قیمت میں۔",
    subtitleUr: "ماہرین سے چیک شدہ، 12 ماہ کی وارنٹی کے ساتھ، پاکستان میں کہیں بھی ڈیلیوری۔",
    ctaLabelUr: "فونز دیکھیں",
    ctaHref: "/l/smartphones",
    theme: "lime",
  },
  {
    placement: "HOME_PROMO" as const,
    title: "iPhone 14 from Rs 125,000",
    subtitle: "Half the price of new, same iOS experience.",
    ctaLabel: "See deal",
    titleUr: "iPhone 14 صرف Rs 125,000 سے",
    subtitleUr: "نئے کی آدھی قیمت، وہی iOS تجربہ۔",
    ctaLabelUr: "ڈیل دیکھیں",
    ctaHref: "/p/iphone-14",
    theme: "lilac",
  },
  {
    placement: "HOME_PROMO" as const,
    title: "Pay cash on delivery",
    subtitle: "Check your device at your door, then pay. Available nationwide.",
    ctaLabel: "How it works",
    titleUr: "کیش آن ڈیلیوری",
    subtitleUr: "اپنے دروازے پر ڈیوائس چیک کریں، پھر ادائیگی کریں۔ پورے ملک میں دستیاب۔",
    ctaLabelUr: "یہ کیسے کام کرتا ہے",
    ctaHref: "/help/cash-on-delivery",
    theme: "sky",
  },
];
