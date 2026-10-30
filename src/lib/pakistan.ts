// Provinces match the Prisma `Province` enum.

export const PROVINCES = [
  { value: "PUNJAB", label: "Punjab" },
  { value: "SINDH", label: "Sindh" },
  { value: "KHYBER_PAKHTUNKHWA", label: "Khyber Pakhtunkhwa" },
  { value: "BALOCHISTAN", label: "Balochistan" },
  { value: "ISLAMABAD", label: "Islamabad Capital Territory" },
  { value: "GILGIT_BALTISTAN", label: "Gilgit-Baltistan" },
  { value: "AZAD_KASHMIR", label: "Azad Kashmir" },
] as const;

export type ProvinceValue = (typeof PROVINCES)[number]["value"];

export const provinceLabel = (value: string) => PROVINCES.find((p) => p.value === value)?.label ?? value;

/** Major cities, used to suggest a city and fill in its province. Any city can still be typed. */
export const CITIES: { name: string; province: ProvinceValue }[] = [
  { name: "Karachi", province: "SINDH" },
  { name: "Lahore", province: "PUNJAB" },
  { name: "Islamabad", province: "ISLAMABAD" },
  { name: "Rawalpindi", province: "PUNJAB" },
  { name: "Faisalabad", province: "PUNJAB" },
  { name: "Multan", province: "PUNJAB" },
  { name: "Gujranwala", province: "PUNJAB" },
  { name: "Sialkot", province: "PUNJAB" },
  { name: "Bahawalpur", province: "PUNJAB" },
  { name: "Sargodha", province: "PUNJAB" },
  { name: "Sheikhupura", province: "PUNJAB" },
  { name: "Gujrat", province: "PUNJAB" },
  { name: "Sahiwal", province: "PUNJAB" },
  { name: "Rahim Yar Khan", province: "PUNJAB" },
  { name: "Jhelum", province: "PUNJAB" },
  { name: "Dera Ghazi Khan", province: "PUNJAB" },
  { name: "Hyderabad", province: "SINDH" },
  { name: "Sukkur", province: "SINDH" },
  { name: "Larkana", province: "SINDH" },
  { name: "Nawabshah", province: "SINDH" },
  { name: "Mirpur Khas", province: "SINDH" },
  { name: "Peshawar", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Mardan", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Abbottabad", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Swat", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Kohat", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Dera Ismail Khan", province: "KHYBER_PAKHTUNKHWA" },
  { name: "Quetta", province: "BALOCHISTAN" },
  { name: "Gwadar", province: "BALOCHISTAN" },
  { name: "Turbat", province: "BALOCHISTAN" },
  { name: "Gilgit", province: "GILGIT_BALTISTAN" },
  { name: "Skardu", province: "GILGIT_BALTISTAN" },
  { name: "Muzaffarabad", province: "AZAD_KASHMIR" },
  { name: "Mirpur", province: "AZAD_KASHMIR" },
];
