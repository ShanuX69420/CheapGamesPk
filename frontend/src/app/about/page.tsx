import type { Metadata } from "next";
import Link from "next/link";

import { WhatsAppIcon } from "@/components/icons";
import { getStoreConfig, safely } from "@/lib/api";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Selling PC games in Pakistan since 2024 — thousands of buyers reached on Instagram, now on our own store with delivery and support on WhatsApp.",
};

/* The numbers under the profile screenshot. They come from the screenshot
   itself, so a reader can check every one against the image beside them. */
const STATS = [
  { value: "2024", label: "selling since" },
  { value: "3,800+", label: "Instagram followers" },
  { value: "435K", label: "profile views in 30 days" },
  { value: "1.3M", label: "views on our top reel" },
];

export default async function AboutPage() {
  const config = await safely(getStoreConfig(), {
    currency: "PKR",
    whatsapp_number: null,
    order_statuses: {},
  });
  const number = config.whatsapp_number;

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-10 sm:px-6">
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Selling games since 2024. Now on our own store.
          </h1>

          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-200">
            <p>
              cheapgames.pk started on Instagram as{" "}
              <span className="font-medium text-ink-50">@cheappcgames.pk</span>{" "}
              — one seller, offline activations, and buyers who kept coming
              back. Over two years that page grew to 3,800+ followers and
              hundreds of delivered orders, with our price-list reel passing a
              million views.
            </p>
            <p>
              Instagram suspends seller accounts all the time, and eventually
              ours got caught in that sweep too — nothing to do with our
              buyers, who you can see happily playing in the{" "}
              <Link
                href="/reviews"
                className="font-medium text-accent-bright transition-colors hover:text-ink-50"
              >
                review screenshots
              </Link>
              . So instead of starting a third page from zero, we built the
              thing an Instagram page never gave us: our own store, with every
              game listed, priced and searchable.
            </p>
            <p>
              The way you buy hasn&rsquo;t changed. You pick a game, the site
              opens WhatsApp with your order written out, you pay however suits
              you — JazzCash, EasyPaisa, bank transfer — and your game arrives
              in the same chat, with setup help until it runs. The chat is your
              receipt, and if anything breaks during activation, you message
              the same number and a real person answers.
            </p>
            <p>
              Every review on this site is a screenshot of that exact flow,
              because that is the only kind of proof that matters: someone paid,
              got their game, and it works.
            </p>
          </div>

          {number && (
            <a
              href={`https://wa.me/${number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-bright hover:text-ink-950"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Message us on WhatsApp
            </a>
          )}
        </div>

        <figure className="mx-auto w-full max-w-xs lg:mx-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/reviews/profile.webp"
            alt="Screenshot of our Instagram profile, @cheappcgames.pk — 52 posts, 3,872 followers, 435K views in the last 30 days"
            width={720}
            height={1558}
            className="w-full rounded-lg ring-1 ring-ink-700"
          />
          <figcaption className="mt-2 text-center text-xs text-ink-400">
            Our Instagram profile before the suspension — the same store, the
            same seller.
          </figcaption>
        </figure>
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-ink-800 bg-ink-900 p-5 text-center"
          >
            <dt className="order-last mt-1 text-sm text-ink-400">{stat.label}</dt>
            <dd className="text-2xl font-bold tabular-nums text-ink-50">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
