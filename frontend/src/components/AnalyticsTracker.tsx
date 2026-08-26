"use client";

import { useEffect, useRef } from "react";

import { gaViewItem } from "@/lib/ga";

/**
 * Reports a product page view to Google Analytics, once per product.
 *
 * The GA half of `PixelTracker`, and remembers what it last reported for the
 * same reason: React runs an effect twice in development and again on any
 * remount, and counting runs instead would report a phantom view every time.
 *
 * There is no page-view counterpart — GA4's enhanced measurement reports those
 * itself. See `GoogleAnalytics.tsx`.
 *
 * Renders nothing.
 */
export function TrackViewItem({
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
    gaViewItem({ slug, title, price });
  }, [slug, title, price]);

  return null;
}
