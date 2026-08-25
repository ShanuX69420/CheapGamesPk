import type { Platform } from "@/lib/types";

/* The house rules for offline activation accounts. Identical on every such
   listing, so they live here rather than being retyped per product in admin.
   Only the client's name moves between platforms — the rules themselves are
   the same whether the account is a Steam one or a Ubisoft one. */
type Client = {
  /* What the buyer calls the account of their own that this one is not. */
  account: string;
  /* Who we disclaim any affiliation with. */
  owner: string;
  /* Steam is the only one of these with a library-sharing feature to forbid. */
  sharing?: string;
};

const CLIENTS: Record<string, Client> = {
  steam: {
    account: "Steam",
    owner: "Valve Corporation or Steam",
    sharing: "Use of the Family Library Sharing feature is prohibited.",
  },
  "ea-app": { account: "EA", owner: "Electronic Arts" },
  "ubisoft-connect": { account: "Ubisoft", owner: "Ubisoft Entertainment" },
  "microsoft-store": { account: "Microsoft", owner: "Microsoft Corporation" },
  "epic-games": { account: "Epic Games", owner: "Epic Games, Inc." },
};

/* Steam is the catalog's default platform, so it is what a listing with none
   set is selling. */
const FALLBACK = CLIENTS.steam;

function termsFor(client: Client) {
  return [
    `You receive the login details for an account we provide — this is not a game key, and the game is not added to your own ${client.account} account.`,
    "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
    "The account is for offline use only.",
    ...(client.sharing ? [client.sharing] : []),
    "Sharing account details with third parties is prohibited.",
    "Any changes to account details are strictly prohibited.",
    "One activation — 1 PC.",
    "The game can be played indefinitely after setting up offline mode.",
    "Your saves are yours to keep, with no time limit on finishing the game.",
    "You can switch back to your own account without any problems.",
    "Any online features of the game will be unavailable.",
    "Activation is not possible for playing via PlayKey, GFN, Google Stadia, Loudplay, Drova, or other cloud services.",
    "Assistance with product issues is available for 6 months from the date of purchase (only activation-related questions).",
    "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
  ];
}

const WARNING =
  "Any violation of these conditions will result in service denial without a refund.";

export function OfflineTerms({ platform }: { platform: Platform | null }) {
  const client = (platform && CLIENTS[platform.slug]) || FALLBACK;

  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Terms of use
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
        {termsFor(client).map((term) => (
          <li key={term} className="flex items-start gap-2.5">
            <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-600" />
            <span>{term}</span>
          </li>
        ))}
      </ul>
      {/* The one line a buyer must not skim, so it is the only coloured thing
          in the panel. */}
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
