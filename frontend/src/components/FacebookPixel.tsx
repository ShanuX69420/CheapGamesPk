import Script from "next/script";
import { Suspense } from "react";

import { PIXEL_ID } from "@/lib/pixel";

import { PixelPageViews } from "./PixelTracker";

/**
 * Meta's pixel, loaded once for the whole site from the root layout.
 *
 * `beforeInteractive` puts the snippet in the HTML the server sends, so `fbq`
 * exists before React hydrates — otherwise the first events of a visit race
 * the script and lose. The snippet itself only queues; the 80KB of fbevents.js
 * it pulls in is fetched async and never blocks the page.
 *
 * It reports the PageView it loads on and nothing after that, because it never
 * runs again — `PixelPageViews` covers navigation. See `lib/pixel.ts` for the
 * rest of the events and for how a sale ends up counted.
 *
 * Renders nothing at all when `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` is unset, which
 * is how development and a fresh checkout stay out of the ad data. That value
 * is baked in at build time, so setting it later means rebuilding.
 */
export function FacebookPixel() {
  if (!PIXEL_ID) return null;

  return (
    <>
      {/* The strategy rule is written for the Pages Router, where this was
          only legal in _document.js. The App Router's equivalent is the root
          layout, which is where this renders from — confirmed in the build
          output, where the snippet is queued ahead of hydration. */}
      {/* eslint-disable-next-line @next/next/no-before-interactive-script-outside-document */}
      <Script
        id="facebook-pixel"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');`,
        }}
      />

      {/* Counts the visitors who never run the script at all. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>

      {/* useSearchParams reads the URL, which is only known per-request — this
          boundary keeps the pages above it prerenderable. */}
      <Suspense fallback={null}>
        <PixelPageViews />
      </Suspense>
    </>
  );
}
