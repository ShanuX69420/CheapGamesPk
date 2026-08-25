import type { Platform } from "@/lib/types";

/* The house rules for the accounts we sell outright. The opposite trade from
   an offline activation: the buyer gets the account itself, fresh and
   unplayed, and everything online works — what it costs instead is the first
   month, during which the account stays on our email so we can still recover
   it. Identical on every such listing, so the words live here rather than
   being retyped per product in admin. */
type Client = {
  /* The client the account is signed into, named as the buyer would say it. */
  name: string;
  /* Who we disclaim any affiliation with. */
  owner: string;
};

const CLIENTS: Record<string, Client> = {
  steam: { name: "Steam", owner: "Valve Corporation or Steam" },
  "ea-app": { name: "EA", owner: "Electronic Arts" },
  "ubisoft-connect": { name: "Ubisoft", owner: "Ubisoft Entertainment" },
  "microsoft-store": { name: "Microsoft", owner: "Microsoft Corporation" },
  "epic-games": { name: "Epic Games", owner: "Epic Games, Inc." },
};

/* Steam is the catalog's default platform, so it is what a listing with none
   set is selling. */
const FALLBACK = CLIENTS.steam;

function termsFor(client: Client) {
  return [
    `You receive the login details for a brand-new ${client.name} account made for this sale, with the game already on it and no hours played — not a shared account, and not a key for an account of your own.`,
    "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
    "Full access: the account is yours. Online play, multiplayer, cloud saves and achievements all work exactly as they would on any account of your own.",
    "Change the password as soon as you have signed in, and keep the new one somewhere safe.",
    "Change the account's email address to your own after one month — not before.",
    "Play on as many of your own PCs as you like. There is no activation limit on an account you own.",
    "The account is sold once, to you. The same details are not handed to anybody else.",
    "Assistance with account questions is available for 6 months from the date of purchase.",
    "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
  ];
}

/* The one rule with a cost attached to breaking it, so it is the only coloured
   thing in the panel. */
const WARNING =
  "The first month is what makes the account recoverable: while it is still on our email we can get it back for you if anything goes wrong. Move the email to your own before the month is up and that safety net is gone.";

export function FullAccessTerms({ platform }: { platform: Platform | null }) {
  const client = (platform && CLIENTS[platform.slug]) || FALLBACK;

  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Terms of use
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
        {termsFor(client).map((term) => (
          <li key={term} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-600"
            />
            <span>{term}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-ink-800 pt-3 text-sm font-medium text-deal">
        {WARNING}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-ink-500">
        cheapgames.pk is an independent seller and is not affiliated with,
        endorsed by, or sponsored by {client.owner}.
      </p>
    </section>
  );
}
