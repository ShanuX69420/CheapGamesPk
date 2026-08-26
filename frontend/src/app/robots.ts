import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/* Order URLs carry the access token and the cart is per-buyer — nothing there
   for a crawler. /api and /admin are Django's, behind the same origin. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/order/", "/cart", "/api/", "/admin/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
