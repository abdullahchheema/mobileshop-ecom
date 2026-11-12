// Real photos of the products we list, from Wikimedia Commons under Creative Commons licenses.
// Every license here requires crediting the photographer (CC0 asks for nothing, but we credit it too),
// so each photo carries its credit and the credits page lists them all. Photos were resized and
// recompressed (transparent backgrounds put on white), nothing else.
// Only products with a photo of that exact model are listed; the others keep the illustration.

export type PhotoCredit = {
  /** Photographer, as named on Wikimedia Commons. */
  author: string;
  license: string;
  licenseUrl: string;
  /** The photo's page on Wikimedia Commons. */
  source: string;
  /** What the photo shows, for the credits page. */
  subject: string;
};

export const PRODUCT_PHOTOS: Record<string, { image: string; credit: PhotoCredit }> = {
  "iphone-15": {
    image: "/images/products/iphone-15.jpg",
    credit: { author: "Ka Kit Pang", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_15.jpeg", subject: "iPhone 15" },
  },
  "iphone-15-pro": {
    image: "/images/products/iphone-15-pro.jpg",
    credit: { author: "Ka Kit Pang", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_15_Pro.jpeg", subject: "iPhone 15 Pro" },
  },
  "iphone-15-pro-max": {
    image: "/images/products/iphone-15-pro-max.jpg",
    credit: { author: "Ka Kit Pang", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_15_Pro_Max.jpeg", subject: "iPhone 15 Pro Max" },
  },
  "iphone-16": {
    image: "/images/products/iphone-16.jpg",
    credit: { author: "Padgriffin", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_16_Ultramarine_Rear.png", subject: "iPhone 16" },
  },
  "iphone-13": {
    image: "/images/products/iphone-13.jpg",
    credit: { author: "Tatsuo Yamashita from Tokyo, Japan", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_13_for_Tora_(52641558635).jpg", subject: "iPhone 13" },
  },
  "iphone-se-2022": {
    image: "/images/products/iphone-se-2022.jpg",
    credit: { author: "Hajoon0102", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Back_of_the_iPhone_SE_(3rd_generation).jpg", subject: "iPhone SE (2022)" },
  },
  "airpods-pro-2": {
    image: "/images/products/airpods-pro-2.jpg",
    credit: { author: "Hajoon0102", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:AirPods_Pro_(2nd_generation).jpg", subject: "AirPods Pro (2nd gen)" },
  },
  "hp-elitebook-840-g8": {
    image: "/images/products/hp-elitebook-840-g8.jpg",
    credit: { author: "Infinatious", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:HP_EliteBook_840_G8.png", subject: "HP EliteBook 840 G8" },
  },
  "ipad-10th-gen": {
    image: "/images/products/ipad-10th-gen.jpg",
    credit: { author: "Riski394", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPad_10.png", subject: "iPad (10th generation)" },
  },
  "macbook-air-13-m1": {
    image: "/images/products/macbook-air-13-m1.jpg",
    credit: { author: "L", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Macbook_Air_M1_Silver_PNG.png", subject: "MacBook Air 13-inch M1" },
  },
  "macbook-pro-14-m3": {
    image: "/images/products/macbook-pro-14-m3.jpg",
    credit: { author: "Kyu3a", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:M3_Macbook_Pro_14_inch_Space_Grey_model_(cropped).jpg", subject: "MacBook Pro 14-inch M3" },
  },
  "nintendo-switch-oled": {
    image: "/images/products/nintendo-switch-oled.jpg",
    credit: { author: "PantheraLeo1359531", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:Nintendo_Switch_%E2%80%93_OLED-Modell,_Konsole_und_Dock_20230506.png", subject: "Nintendo Switch OLED" },
  },
  "pixel-8": {
    image: "/images/products/pixel-8.jpg",
    credit: { author: "Syced", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Google_Pixel_8,_shown_in_Shibuya_Stream_2.jpg", subject: "Pixel 8" },
  },
  "galaxy-a55": {
    image: "/images/products/galaxy-a55.jpg",
    credit: { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_A55_5G_2024.jpg", subject: "Galaxy A55" },
  },
  "galaxy-s23-ultra": {
    image: "/images/products/galaxy-s23-ultra.jpg",
    credit: { author: "PantheraLeo1359531", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S23_Ultra,_512_GB,_Lavender_20230416_HOF00318_RAW-Export_cens.png", subject: "Galaxy S23 Ultra" },
  },
  "galaxy-s24": {
    image: "/images/products/galaxy-s24.jpg",
    credit: { author: "C.Stadler/Bwag", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S24,_Sperrbildschirm.JPG", subject: "Galaxy S24" },
  },
  "galaxy-tab-s9": {
    image: "/images/products/galaxy-tab-s9.jpg",
    credit: { author: "AnVuong1222004", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Tab_S9.png", subject: "Galaxy Tab S9" },
  },
  "galaxy-watch6": {
    image: "/images/products/galaxy-watch6.jpg",
    credit: { author: "Ganesh Mohan T", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Watch_6.jpg", subject: "Galaxy Watch6" },
  },
  "galaxy-z-flip5": {
    image: "/images/products/galaxy-z-flip5.jpg",
    credit: { author: "Striker9498", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:20230729_%EC%82%BC%EC%84%B1_%EA%B0%A4%EB%9F%AD%EC%8B%9C_Z_%ED%94%8C%EB%A6%BD5_%ED%8E%BC%EC%B9%9C%EC%83%81%ED%83%9C.jpg", subject: "Galaxy Z Flip5" },
  },
  "xbox-series-x": {
    image: "/images/products/xbox-series-x.jpg",
    credit: { author: "Der. Bellemer", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", source: "https://commons.wikimedia.org/wiki/File:Xbox_Series_X_mit_Controller_(transparent_background).png", subject: "Xbox Series X" },
  },
  "iphone-14": {
    image: "/images/products/iphone-14.jpg",
    credit: { author: "メイド理世", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Back_view_of_iPhone_14_Blue.jpg", subject: "iPhone 14" },
  },
  "iphone-12": {
    image: "/images/products/iphone-12.jpg",
    credit: { author: "茅野ふたば", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_12_Green_128g.jpg", subject: "iPhone 12" },
  },
  "iphone-11": {
    image: "/images/products/iphone-11.jpg",
    credit: { author: "IToms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_11_Product_RED.jpg", subject: "iPhone 11" },
  },
  "iphone-16-pro": {
    image: "/images/products/iphone-16-pro.jpg",
    credit: { author: "Farragutful", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_16_Pro_-_black.jpg", subject: "iPhone 16 Pro" },
  },
  "iphone-16-pro-max": {
    image: "/images/products/iphone-16-pro-max.jpg",
    credit: { author: "茅野ふたば", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPhone_16_Pro_Max_White_256g.jpg", subject: "iPhone 16 Pro Max" },
  },
  "galaxy-s24-ultra": {
    image: "/images/products/galaxy-s24-ultra.jpg",
    credit: { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S24_Ultra_2024.jpg", subject: "Galaxy S24 Ultra" },
  },
  "xiaomi-14": {
    image: "/images/products/xiaomi-14.jpg",
    credit: { author: "茅野ふたば", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Xiaomi_14_(July_10,_2026).jpg", subject: "Xiaomi 14" },
  },
  "macbook-air-13-m2": {
    image: "/images/products/macbook-air-13-m2.jpg",
    credit: { author: "KKPCW（Kyu3）", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:M2_Macbook_Air_Midnight_model_-_1.jpg", subject: "MacBook Air 13-inch M2" },
  },
  "ipad-air-11-m2": {
    image: "/images/products/ipad-air-11-m2.jpg",
    credit: { author: "茅野ふたば", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:IPad_Air_11-inch_(M2)_back_side_(20250525_154602).jpg", subject: "iPad Air 11-inch M2" },
  },
  "apple-watch-se-2": {
    image: "/images/products/apple-watch-se-2.jpg",
    credit: { author: "茅野ふたば", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/wiki/File:Watch_SE_(2nd_generation).jpg", subject: "Apple Watch SE (2nd gen)" },
  },
};

/** Credit for a photo path stored on a product, or null for uploads and illustrations. */
export function creditForImage(image: string): PhotoCredit | null {
  return Object.values(PRODUCT_PHOTOS).find((p) => p.image === image)?.credit ?? null;
}
