import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Private and per-visitor pages, in both languages. Search results are thin, so they stay out too.
const PRIVATE = ["/account", "/cart", "/checkout", "/search", "/sign-in", "/sign-up", "/sell/apply", "/sell/status"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        ...PRIVATE,
        ...PRIVATE.map((path) => `/ur${path}`),
        "/seller",
        "/admin",
        "/api/",
        "/payment/",
        "/dev/",
      ],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
