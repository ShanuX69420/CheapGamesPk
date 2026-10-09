import type { Metadata } from "next";
import Link from "next/link";

import { WhatsAppIcon } from "@/components/icons";
import { getStoreConfig, safely } from "@/lib/api";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Selling PC games in Pakistan since 2024 — thousands of buyers reached on Instagram, now on our own store with delivery and support on WhatsApp.",
  alternates: { canonical: "/about" },
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
            Selling games since 2024. Now on our own website.
          </h1>

          <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-ink-200">
            <p>
              We started on Instagram as{" "}
              <span className="font-medium text-ink-50">@cheappcgames.pk</span>,
              selling offline activations. In two years the page grew to 3,800+
              followers, we delivered hundreds of orders, and our price-list
              reel passed a million views.
            </p>
            <p>
              Then Instagram suspended the account. It happens to a lot of
              sellers. Instead of starting a new page from zero, we built this
              website, where every game is listed with its price and you can
              search for it.
            </p>
            <p>Buying works the same as before:</p>
            <ol className="list-decimal space-y-2 pl-5 marker:text-ink-400">
              <li>
                <span className="font-medium text-ink-50">Pick a game.</span>{" "}
                The site opens WhatsApp with your order already typed out.
              </li>
              <li>
                <span className="font-medium text-ink-50">Pay</span> with
                JazzCash, EasyPaisa or bank transfer.
              </li>
              <li>
                <span className="font-medium text-ink-50">Get your game</span>{" "}
                in the same chat. We&rsquo;ll help you set it up until it runs.
              </li>
            </ol>
            <p>
              If anything goes wrong during activation, message the same number
              and a real person will reply.
            </p>
            <p>
              Every{" "}
              <Link
                href="/reviews"
                className="font-medium text-accent-bright transition-colors hover:text-ink-50"
              >
                review on this site
              </Link>{" "}
              is a screenshot of a real chat like this one: someone paid, got
              their game, and played it.
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
            Our Instagram profile before it was suspended.
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
