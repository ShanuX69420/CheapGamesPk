/** The public origin. Canonicals, OG tags, JSON-LD and the sitemap all need
    absolute URLs. One store, one domain — a constant, not configuration. */
export const SITE_URL = "https://cheapgames.pk";

export const SITE_NAME = "cheapgames.pk";

/* Keyword first, brand last — "cheap pc games pakistan" is the search being
   targeted, and the domain repeats the brand in the result anyway. The
   storefront's own title, and the fallback for any page without one. */
export const SITE_TITLE = "Cheap PC Games in Pakistan — Steam Accounts & Keys";
export const SITE_DESCRIPTION =
  "Buy PC games at a fraction of store price — offline activations, Steam accounts and genuine keys. Fast delivery on WhatsApp, prices in PKR.";

/** Broadcast channel, not the order-taking number — announcements go here. */
export const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbB2FRR3WHTZeAm8mm1h";

/* Metadata merging is shallow: a page that defines its own `openGraph` wipes
   the layout's, site-wide fields included. Pages spread this back in. */
export const OG_SITE = {
  type: "website",
  siteName: SITE_NAME,
} as const;
