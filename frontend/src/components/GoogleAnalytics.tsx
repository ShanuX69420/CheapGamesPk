import Script from "next/script";

import { GA_MEASUREMENT_ID } from "@/lib/ga";

/**
 * Google Analytics 4 via gtag.js, loaded once for the whole site from the root
 * layout. No Tag Manager — there is one site, one tag and nobody but us
 * editing it, and a container in the middle would only be somewhere for a
 * second Meta pixel to appear and double-count every conversion.
 *
 * Split the way the Meta pixel is: the inline stub goes in
 * `beforeInteractive`, so `gtag` exists before React hydrates and the first
 * events of a visit do not race the script. It only pushes onto `dataLayer`;
 * the tag itself is fetched after hydration and drains the queue when it
 * arrives, so nothing waits on 100KB of Google.
 *
 * **Page views are GA's own job here.** Enhanced measurement — on by default
 * on every GA4 data stream — reports a page_view on each History API change,
 * which is exactly what an App Router navigation is. Reporting them from here
 * as well would count every page twice, and there is no `event_id` to dedupe
 * on the way the pixel has. So `PixelPageViews` has no counterpart: if page
 * views ever stop arriving, check that stream setting before this file. What
 * GA cannot see on its own is in `lib/ga.ts`, and how a sale ends up counted
 * is in `apps/orders/ga.py`.
 *
 * Renders nothing at all when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is unset, which
 * is how development and a fresh checkout stay out of the reports. That value
 * is baked in at build time, so setting it later means rebuilding.
 */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      {/* Same reasoning as the pixel: the strategy rule is written for the
          Pages Router, and the App Router's equivalent of _document.js is the
          root layout, which is where this renders from. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        id="google-analytics"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments)}
window.gtag=gtag;
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`,
        }}
      />

      {/* Queued behind hydration and fetched async — by the time it runs, the
          stub above already has this visit's events waiting for it. */}
      <Script
        id="google-analytics-tag"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
    </>
  );
}
