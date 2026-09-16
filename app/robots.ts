import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Public product images are served from /api/products/images/*.
      // Do not block the whole /api tree: crawlers need those images.
      disallow: ["/admin", "/api/admin/", "/api/customer/", "/api/orders/", "/cart", "/checkout", "/order-confirmation", "/orders"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
