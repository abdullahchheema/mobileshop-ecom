import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

// Default share image for every storefront page. Text is English in both
// languages: the image renderer has no Urdu font bundled.
export const alt = `${site.name}: refurbished phones and tech in Pakistan`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Hex versions of the theme tokens (the renderer doesn't read oklch or CSS variables).
const LIME = "#e3f77e";
const INK = "#110f15";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: LIME, padding: 72, color: INK }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="72" height="72" viewBox="0 0 32 32">
              <rect width="32" height="32" rx="9" fill={INK} />
              <rect x="11" y="7" width="10" height="18" rx="2.5" fill="none" stroke="white" strokeWidth="2" />
              <path d="M24.5 12.5a9 9 0 0 1-3 12" fill="none" stroke={LIME} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="16" cy="21.5" r="1.1" fill="white" />
            </svg>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 800 }}>
              trendz<span style={{ fontWeight: 500 }}>mobile</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 900 }}>
              Refurbished phones & tech, checked by experts.
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 30 }}>
              {[`${site.warrantyMonths}-month warranty`, `${site.returnDays}-day returns`, "Cash on delivery"].map((perk) => (
                <div key={perk} style={{ display: "flex", background: "white", borderRadius: 999, padding: "10px 24px" }}>
                  {perk}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
