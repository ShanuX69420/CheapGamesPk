import type { MetadataRoute } from "next";

import { getAllProducts, getPlatforms, safely } from "@/lib/api";
import { TYPE_SECTIONS, platformSection } from "@/lib/catalog";
import { SITE_URL } from "@/lib/site";

/* Every product page, every section with something in it, and the five
   pages a buyer can land on. Re-cuts of a section (?platform=, ?ordering=)
   and searches stay out — they canonicalize to the section anyway. Deeper
   pages of a section are their own canonical but are reached from page 1,
   which is enough. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, platforms] = await Promise.all([
    safely(getAllProducts(), []),
    safely(getPlatforms(), []),
  ]);

  /* An empty section is a "nothing matches" page, and noindexed as one. */
  const sections = [
    ...TYPE_SECTIONS.filter((s) =>
      products.some((p) => p.product_type === s.facet.type),
    ),
    ...platforms
      .filter((pl) => products.some((p) => p.platform?.slug === pl.slug))
      .map(platformSection),
  ];

  /* Listings carry a <lastmod> because the model tracks one; the hand-
     written pages do not, and a made-up date on them would be worse than the
     omission — Google demotes a sitemap whose dates it catches out. */
  return [
    { url: SITE_URL },
    ...sections.map((s) => ({ url: `${SITE_URL}${s.path}` })),
    { url: `${SITE_URL}/reviews` },
    { url: `${SITE_URL}/faq` },
    { url: `${SITE_URL}/about` },
    { url: `${SITE_URL}/terms` },
    ...products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updated_at,
    })),
  ];
}
