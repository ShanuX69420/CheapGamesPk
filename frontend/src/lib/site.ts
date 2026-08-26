/** The public origin. Canonicals, OG tags, JSON-LD and the sitemap all need
    absolute URLs. One store, one domain — a constant, not configuration. */
export const SITE_URL = "https://cheapgames.pk";

/* Metadata merging is shallow: a page that defines its own `openGraph` wipes
   the layout's, site-wide fields included. Pages spread this back in. */
export const OG_SITE = {
  type: "website",
  siteName: "cheapgames.pk",
} as const;
