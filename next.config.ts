import type { NextConfig } from "next";

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
    // Uploaded product photos never change in place (new uploads get new names).
    minimumCacheTTL: 60 * 60 * 24 * 30,
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
