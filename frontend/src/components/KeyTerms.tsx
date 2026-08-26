import type { Platform } from "@/lib/types";

/* The house rules for keys. The simplest thing we sell and the only one with
   no account of ours in it: the buyer redeems the code on their own account
   and owns the game outright. Identical on every key listing — only where the
   code is pasted moves between storefronts — so the words live here rather
   than being retyped per product in admin. */
type Store = {
  /* The storefront, named as the buyer would say it. */
  name: string;
  /* Where the code goes. */
  redeem: string;
  /* Who we disclaim any affiliation with. */
  owner: string;
};

const STORES: Record<string, Store> = {
  steam: {
    name: "Steam",
    redeem:
      "In Steam, open Games → Activate a Product on Steam and paste the key.",
    owner: "Valve Corporation or Steam",
  },
  "rockstar-games": {
    name: "Rockstar Games",
    redeem:
      "In the Rockstar Games Launcher, open your account menu → Redeem Code and paste the key.",
    owner: "Rockstar Games or Take-Two Interactive",
  },
  "microsoft-store": {
    name: "Microsoft",
    redeem:
      "Go to redeem.microsoft.com, sign in with your own Microsoft account and paste the code.",
    owner: "Microsoft Corporation",
  },
  "ea-app": {
    name: "EA",
    redeem:
      "In the EA app, open the menu beside your avatar → Redeem Product Code and paste the key.",
    owner: "Electronic Arts",
  },
  "ubisoft-connect": {
    name: "Ubisoft",
    redeem:
      "In Ubisoft Connect, open the top-left menu → Activate a Key and paste it.",
    owner: "Ubisoft Entertainment",
  },
  "epic-games": {
    name: "Epic Games",
    redeem:
      "In the Epic Games Launcher, open your account menu → Redeem Code and paste the key.",
    owner: "Epic Games, Inc.",
  },
};

/* Steam is the catalog's default platform, so it is what a listing with none
   set is selling. */
const FALLBACK = STORES.steam;

function termsFor(store: Store) {
  return [
    `You receive a genuine activation key, redeemed on your own ${store.name} account. No account of ours is involved at any point.`,
    "The key is sent to you on WhatsApp as soon as your payment is confirmed.",
    store.redeem,
    "The game is then yours permanently, in your own library — online play, multiplayer, achievements and cloud saves all work, because it is your own account.",
    "Install it on as many of your own PCs as you like.",
    "A key redeems once. We check it before it is sent, and if it will not activate you get another one or a full refund.",
    "Assistance with activation is available for 6 months from the date of purchase.",
  ];
}

/* The mistake that cannot be undone, so it is the only coloured thing in the
   panel. */
const WARNING =
  "Check which store the key is for before you buy: a key for one launcher will not redeem on another, and once a key has been redeemed it cannot be returned.";

export function KeyTerms({ platform }: { platform: Platform | null }) {
  const store = (platform && STORES[platform.slug]) || FALLBACK;

  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Terms of use
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
        {termsFor(store).map((term) => (
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
        endorsed by, or sponsored by {store.owner}.
      </p>
    </section>
  );
}
