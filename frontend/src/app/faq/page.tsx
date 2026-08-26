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
 * Wording must agree with the terms panels on the product pages
 * (OfflineTerms / KeyTerms / FullAccessTerms / GamePassTerms) — if a promise
 * changes there, it changes here too.
 */
const FAQS: { question: string; answer: React.ReactNode }[] = [
  {
    question: "How do I buy a game?",
    answer: (
      <>
        Pick a game and press <strong>Buy now on WhatsApp</strong>. The chat
        opens with your order already written — send it, and we take it from
        there. You pay in the chat, and your game is delivered in the same
        conversation. There is no checkout form and no account to create.
      </>
    ),
  },
  {
    question: "Which payment methods do you accept?",
    answer: (
      <>
        JazzCash, EasyPaisa and bank transfer. We confirm the details with you
        in the chat before you send anything.
      </>
    ),
  },
  {
    question: "How fast is delivery?",
    answer: (
      <>
        As soon as your payment is confirmed, usually within minutes — the
        details arrive in the same WhatsApp chat, along with step-by-step setup
        instructions. We are online almost all day, every day.
      </>
    ),
  },
  {
    question: "What is an offline activation?",
    answer: (
      <>
        You get login details for an account of ours that owns the game. You
        sign in, download, switch the client to offline mode, and play — with
        your own saves, for as long as you like, on one PC. It is the cheapest
        way to play because the account is shared: that is also why online
        features and multiplayer are unavailable, and why the account details
        must not be changed. The full rules are on every offline listing.
      </>
    ),
  },
  {
    question: "What is the difference between offline, online and key listings?",
    answer: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong>Offline activation</strong> — cheapest. Our account, your PC,
          offline play only.
        </li>
        <li>
          <strong>Online account</strong> — a brand-new account with the game
          on it, sold outright. Everything works: multiplayer, achievements,
          cloud saves. You change the password immediately and the email after
          a month.
        </li>
        <li>
          <strong>Key</strong> — a genuine code you redeem on your own account.
          The game is permanently yours, no account of ours involved.
        </li>
      </ul>
    ),
  },
  {
    question: "Is this legit? How do I know I can trust you?",
    answer: (
      <>
        We have been selling since 2024 — first on Instagram, where our page
        reached 3,800+ followers, and now here.{" "}
        <Link
          href="/reviews"
          className="font-medium text-accent-bright transition-colors hover:text-ink-50"
        >
          The reviews page
        </Link>{" "}
        is full of real chat screenshots: buyers paying, receiving their game,
        and confirming it runs. Delivery happens in a WhatsApp chat with a real
        person, and the chat stays as your receipt.
      </>
    ),
  },
  {
    question: "The game stopped working — what now?",
    answer: (
      <>
        Message the same WhatsApp chat you bought in. Activation help is
        included with every order for 6 months from purchase — most problems
        are a missed step in offline-mode setup and are fixed in minutes. Keys
        that fail to activate are replaced, or refunded in full.
      </>
    ),
  },
  {
    question: "Can I get a refund?",
    answer: (
      <>
        If we cannot deliver what you paid for, you get a full refund. Once
        working details or a key have been delivered the sale is final — that
        is standard for digital goods, and it is why we confirm what you are
        buying in the chat before you pay.
      </>
    ),
  },
  {
    question: "Do you sell for consoles?",
    answer: (
      <>
        The store is PC-first: Steam, EA, Ubisoft, Epic and Microsoft. Some
        keys and Game Pass subscriptions also work on Xbox — the listing says
        so when they do. If you are unsure, ask in the chat before paying.
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
        Everything buyers usually ask us on WhatsApp before their first order.
        Anything else — just message us, that is what the chat is for.
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
