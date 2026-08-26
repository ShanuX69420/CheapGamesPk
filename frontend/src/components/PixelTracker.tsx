"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { track, trackViewContent } from "@/lib/pixel";

/**
 * Keeps the pixel's idea of "a page" in step with the app's.
 *
 * The base snippet reports the page it loaded on and then never runs again —
 * every move after that is a client-side navigation, which swaps the content
 * without reloading anything. So each effect below reports only what it has
 * not reported before, starting from the page the snippet already covered.
 * Filters count as pages: `/?type=key` is a different page to a buyer and to
 * Meta both.
 *
 * The remembered value is what makes these safe to run twice, which React does
 * in development and will do again on any remount. Counting effect runs instead
 * would report a phantom PageView on every product page.
 */
export function PixelPageViews() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const page = query ? `${pathname}?${query}` : pathname;

  // Seeded with the page the snippet reported on load, so the first render
  // adds nothing.
  const reported = useRef(page);

  useEffect(() => {
    if (reported.current === page) return;
    reported.current = page;
    track("PageView");
  }, [page]);

  return null;
}

/** Reports a product page view, once per product. Renders nothing. */
export function TrackViewContent({
  slug,
  title,
  price,
}: {
  slug: string;
  title: string;
  price: string;
}) {
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === slug) return;
    reported.current = slug;
    trackViewContent({ slug, title, price });
  }, [slug, title, price]);

  return null;
}
