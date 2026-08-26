import type { Metadata } from "next";
import Link from "next/link";

import { ReviewGallery } from "@/components/ReviewGallery";
import { REVIEWS } from "@/lib/reviews";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "Screenshots of real WhatsApp and Instagram chats from buyers — games delivered, activated and confirmed working, since 2024.",
};

export default function ReviewsPage() {
  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Reviews from our buyers
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
          Every screenshot below is a real chat — a buyer paying, getting their
          game, and confirming it works. We have been selling this way since
          2024, first on{" "}
          <Link
            href="/about"
            className="font-medium text-accent-bright transition-colors hover:text-ink-50"
          >
            Instagram
          </Link>{" "}
          and now here. Names and numbers are hidden for privacy. Tap any chat
          to enlarge it.
        </p>
      </div>

      <div className="mt-8">
        <ReviewGallery reviews={REVIEWS} layout="grid" />
      </div>

      <div className="mt-10 rounded-lg border border-ink-800 bg-ink-900 p-6 text-center">
        <p className="text-base font-semibold text-ink-50">
          Your game could be the next screenshot.
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-400">
          Pick a game, pay on WhatsApp, and play today — with setup help on
          every order.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-bright hover:text-ink-950"
        >
          Browse the store <span aria-hidden>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
