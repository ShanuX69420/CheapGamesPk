import type { Metadata } from "next";
import Link from "next/link";

import { FullAccessTerms } from "@/components/FullAccessTerms";
import { GamePassContents, GamePassTerms } from "@/components/GamePassTerms";
import { KeyTerms } from "@/components/KeyTerms";
import { OfflineTerms } from "@/components/OfflineTerms";

export const metadata: Metadata = {
  title: "Terms of use",
  description:
    "The rules for everything we sell — offline activations, full-access accounts, keys and Game Pass accounts: what you get, what you can do with it, support and refunds.",
  alternates: { canonical: "/terms" },
};

/*
 * Every set of house rules in full, once. Each listing shows the short
 * version and links to its section here by anchor, so the ids below are
 * what the product pages point at — rename one and those links break.
 */
const SETS = [
  {
    id: "offline-activations",
    title: "Offline activations",
    intro:
      "The cheapest way to play: you sign in to an account of ours that owns the game and play it in offline mode.",
    terms: <OfflineTerms />,
  },
  {
    id: "full-access-accounts",
    title: "Full-access accounts",
    intro:
      "A brand-new account with the game on it, sold to you outright. Everything online works.",
    terms: <FullAccessTerms />,
  },
  {
    id: "keys",
    title: "Keys",
    intro:
      "A genuine code you redeem on your own account. No account of ours is involved.",
    terms: <KeyTerms />,
  },
  {
    id: "game-pass",
    title: "Game Pass accounts",
    intro:
      "A Microsoft Store account we provide, with 12 months of Xbox Game Pass on it.",
    terms: (
      <>
        <GamePassContents />
        <div className="mt-5 border-t border-ink-800 pt-5">
          <GamePassTerms />
        </div>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Terms of use
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
        The rules depend on what you are buying, and every listing is labelled
        with its type. If anything here is unclear, ask us on WhatsApp before
        you pay. The{" "}
        <Link
          href="/faq"
          className="font-medium text-accent-bright transition-colors hover:text-ink-50"
        >
          FAQ
        </Link>{" "}
        answers the common questions.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {SETS.map((set) => (
          <a
            key={set.id}
            href={`#${set.id}`}
            className="rounded border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-200 transition-colors hover:text-ink-50"
          >
            {set.title}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-8">
        {SETS.map((set) => (
          <section key={set.id} id={set.id} className="scroll-mt-20">
            <h2 className="text-lg font-semibold">{set.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-200">
              {set.intro}
            </p>
            <div className="mt-4 rounded-lg border border-ink-800 bg-ink-900 p-5">
              {set.terms}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-xs leading-relaxed text-ink-400">
        cheapgames.pk is an independent seller and is not affiliated with,
        endorsed by, or sponsored by Valve Corporation, Steam, Electronic Arts,
        Ubisoft Entertainment, Microsoft Corporation, Xbox, Epic Games,
        Rockstar Games, Take-Two Interactive or any game publisher.
      </p>
    </div>
  );
}
