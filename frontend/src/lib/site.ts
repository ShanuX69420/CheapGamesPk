/** The public origin. Canonicals, OG tags, JSON-LD and the sitemap all need
    absolute URLs. One store, one domain — a constant, not configuration. */
export const SITE_URL = "https://cheapgames.pk";

/** Broadcast channel, not the order-taking number — announcements go here. */
export const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbB2FRR3WHTZeAm8mm1h";

/* Metadata merging is shallow: a page that defines its own `openGraph` wipes
   the layout's, site-wide fields included. Pages spread this back in. */
export const OG_SITE = {
  type: "website",
  siteName: "cheapgames.pk",
} as const;
