import type { NextConfig } from "next";

// Product photos are hosted by the ERP (Supabase Storage). Allow its host for next/image.
const photoHost = (() => {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  experimental: {
    // One 404 page for URLs outside every root layout (storefront is per-language).
    globalNotFound: true,
  },
  partialPrefetching: true,
  images: {
    // AVIF is ~20% smaller than WebP for product photos; browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    // Photos are re-fetched at most daily; the ERP serves a new URL when a photo is replaced.
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: photoHost ? [{ protocol: "https", hostname: photoHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },
};

export default nextConfig;
