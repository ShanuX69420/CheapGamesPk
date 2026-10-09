import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How buying works: WhatsApp orders, payment methods, offline activations vs keys vs accounts, delivery speed, and what happens if something breaks.",
  alternates: { canonical: "/faq" },
};

/*
 * The questions every buyer asks in the chat before paying, answered once.
 * Wording must agree with the terms on /terms and the short versions on the
 * product pages (OfflineTerms / KeyTerms / FullAccessTerms / GamePassTerms) —
 * if a promise changes there, it changes here too.
 */
const FAQS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "How do I buy a game?",
    answer: (
      <>
        Pick a game and press <strong>Buy now on WhatsApp</strong>. WhatsApp
        opens with your order already typed out. Send it, pay in the chat, and
        we send your game in the same chat. There&rsquo;s no checkout form and
        no account to create.
      </>
    ),
  },
  {
    question: "Which payment methods do you accept?",
    answer: (
      <>
        JazzCash, EasyPaisa and bank transfer. We give you the payment details
        in the chat before you send anything.
      </>
    ),
  },
  {
    question: "How fast is delivery?",
    answer: (
      <>
        Usually within minutes of your payment being confirmed. Your details
        arrive in the same WhatsApp chat, with step-by-step setup instructions.
        We&rsquo;re online most of the day, every day.
      </>
    ),
  },
  {
    question: "What is an offline activation?",
    answer: (
      <>
        You get the login details for one of our accounts that owns the game.
        You sign in, download the game, switch the client to offline mode and
        play. It works on one PC, your saves are your own, and there&rsquo;s no
        time limit. It&rsquo;s the cheapest way to play because the account is
        shared. That&rsquo;s also why online features and multiplayer
        don&rsquo;t work, and why you must not change the account details. The
        full rules are on our{" "}
        <Link
          href="/terms#offline-activations"
          className="font-medium text-accent-bright transition-colors hover:text-ink-50"
        >
          terms page
        </Link>
        .
      </>
    ),
  },
  {
    question: "What is the difference between offline, online and key listings?",
    answer: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong>Offline activation:</strong> the cheapest. Our account, on
          your PC, offline play only.
        </li>
        <li>
          <strong>Online account:</strong> a brand-new account with the game on
          it, sold to you outright. Multiplayer, achievements and cloud saves
          all work. Change the password straight away, and the email whenever
          you like.
        </li>
        <li>
          <strong>Key:</strong> a genuine code you redeem on your own account.
          The game is yours for good, and no account of ours is involved.
        </li>
      </ul>
    ),
  },
  {
    question: "Is this legit? How do I know I can trust you?",
    answer: (
      <>
        We&rsquo;ve been selling since 2024, first on Instagram, where our page
        reached 3,800+ followers, and now here.{" "}
        <Link
          href="/reviews"
          className="font-medium text-accent-bright transition-colors hover:text-ink-50"
        >
          The reviews page
        </Link>{" "}
        is full of real chat screenshots of buyers paying, getting their game
        and showing it running. You deal with a real person on WhatsApp, and
        the chat is your record of the order.
      </>
    ),
  },
  {
    question: "The game stopped working. What now?",
    answer: (
      <>
        Message us in the same WhatsApp chat you bought in. Activation help is
        included for 6 months after you buy. Most problems are a missed step in
        the offline-mode setup, and we fix them in minutes. If a key
        won&rsquo;t activate, we replace it or refund you in full.
      </>
    ),
  },
  {
    question: "Can I get a refund?",
    answer: (
      <>
        If we can&rsquo;t deliver what you paid for, you get a full refund.
        Once working details or a key have been sent, the sale is final.
        That&rsquo;s standard for digital products, and it&rsquo;s why we
        confirm exactly what you&rsquo;re buying in the chat before you pay.
      </>
    ),
  },
  {
    question: "Do you sell for consoles?",
    answer: (
      <>
        Our games are for PC: Steam, EA, Ubisoft, Epic and Microsoft. A few
        keys also work on Xbox, and those listings say so. Game Pass accounts
        work on PC only. Not sure? Ask in the chat before you pay.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
        The questions buyers ask us most before their first order. If yours
        isn&rsquo;t here, message us on WhatsApp.
      </p>

      <div className="mt-8 space-y-3">
        {FAQS.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-lg border border-ink-800 bg-ink-900"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-ink-50 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <div className="px-5 pb-4 text-sm leading-relaxed text-ink-200">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
