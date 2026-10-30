import { cn } from "@/lib/utils";

// Placeholder product artwork: a simple device illustration tinted with the
// product color. Swapped for real photos once admins can upload images.

function shade(hex: string, amount: number) {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 255;
    return Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount);
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

const SCREEN = "#1d2129";
const EDGE = "rgb(0 0 0 / 0.14)";

export function DeviceArt({ kind, color = "#c9ccd1", className }: { kind: string; color?: string; className?: string }) {
  const dark = shade(color, -0.18);
  const light = shade(color, 0.35);

  return (
    <svg viewBox="0 0 200 200" className={cn("size-full", className)} role="img" aria-hidden>
      {kind === "laptop" ? (
        <>
          <rect x="34" y="42" width="132" height="88" rx="7" fill={color} stroke={EDGE} />
          <rect x="41" y="49" width="118" height="74" rx="3" fill={SCREEN} />
          <path d="M20 134h160l-10 16H30z" fill={dark} stroke={EDGE} />
          <rect x="86" y="134" width="28" height="4" rx="2" fill={shade(color, -0.3)} />
          <rect x="41" y="49" width="56" height="74" fill="white" opacity="0.05" />
        </>
      ) : kind === "tablet" ? (
        <>
          <rect x="42" y="26" width="116" height="152" rx="14" fill={color} stroke={EDGE} />
          <rect x="54" y="38" width="20" height="20" rx="6" fill={dark} />
          <circle cx="64" cy="48" r="5" fill={SCREEN} />
          <rect x="42" y="26" width="58" height="152" rx="14" fill="white" opacity="0.12" />
        </>
      ) : kind === "watch" ? (
        <>
          <rect x="80" y="12" width="40" height="52" rx="8" fill={dark} />
          <rect x="80" y="136" width="40" height="52" rx="8" fill={dark} />
          <rect x="62" y="54" width="76" height="92" rx="22" fill={color} stroke={EDGE} />
          <rect x="70" y="62" width="60" height="76" rx="16" fill={SCREEN} />
          <rect x="138" y="82" width="6" height="16" rx="3" fill={dark} />
          <text x="100" y="106" textAnchor="middle" fontSize="16" fontWeight="700" fill="white" opacity="0.85">
            10:09
          </text>
        </>
      ) : kind === "headphones" ? (
        <>
          <path d="M48 118V96a52 52 0 0 1 104 0v22" fill="none" stroke={dark} strokeWidth="12" strokeLinecap="round" />
          <rect x="34" y="108" width="34" height="56" rx="16" fill={color} stroke={EDGE} />
          <rect x="132" y="108" width="34" height="56" rx="16" fill={color} stroke={EDGE} />
          <rect x="34" y="108" width="14" height="56" rx="7" fill="white" opacity="0.15" />
        </>
      ) : kind === "gamepad" ? (
        <>
          <rect x="40" y="22" width="62" height="156" rx="12" fill={color} stroke={EDGE} />
          <rect x="62" y="22" width="18" height="156" fill={SCREEN} opacity="0.85" />
          <path
            d="M118 120c4-10 12-14 22-14h8c10 0 18 4 22 14l6 24c2 10-6 16-14 10l-10-8h-16l-10 8c-8 6-16 0-14-10z"
            fill={dark}
            stroke={EDGE}
          />
          <circle cx="134" cy="128" r="4" fill={light} />
          <circle cx="158" cy="128" r="4" fill={light} />
        </>
      ) : (
        <>
          {/* smartphone, back view so the color shows */}
          <rect x="58" y="16" width="84" height="168" rx="18" fill={color} stroke={EDGE} />
          <rect x="66" y="25" width="38" height="40" rx="11" fill={dark} />
          <circle cx="77" cy="36" r="7" fill={SCREEN} />
          <circle cx="93" cy="36" r="7" fill={SCREEN} />
          <circle cx="77" cy="53" r="7" fill={SCREEN} />
          <circle cx="93" cy="53" r="3" fill={light} />
          <rect x="58" y="16" width="40" height="168" rx="18" fill="white" opacity="0.12" />
        </>
      )}
    </svg>
  );
}
