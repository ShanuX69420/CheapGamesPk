import {
  TermsFooter,
  TermsList,
  TermsPanel,
  TermsWarning,
} from "@/components/TermsPanel";
import type { Platform } from "@/lib/types";

/* The house rules for keys. The simplest thing we sell and the only one with
   no account of ours in it: the buyer redeems the code on their own account
   and owns the game outright. The full set is the same on every key listing,
   so it lives once, on /terms, with every store's redeem step; a listing
   shows the short version, with its own store's. */
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

/* The mistake that cannot be undone. */
const WARNING =
  "Check which store the key is for before you buy. A key for one launcher will not work on another, and a redeemed key cannot be returned.";

/** The full rules, for /terms. */
export function KeyTerms() {
  return (
    <>
      <TermsList
        items={[
          "You get a genuine activation key for the store the listing names, and you redeem it on your own account. No account of ours is involved.",
          "The key is sent to you on WhatsApp as soon as your payment is confirmed.",
          <>
            Where the key goes:
            <ul className="mt-1.5 space-y-1 text-ink-200">
              {Object.values(STORES).map((store) => (
                <li key={store.name}>
                  <span className="text-ink-200">{store.name}:</span>{" "}
                  {store.redeem}
                </li>
              ))}
            </ul>
          </>,
          "The game is then yours for good, in your own library. Online play, multiplayer, achievements and cloud saves all work, because it is your own account.",
          "Install it on as many of your own PCs as you like.",
          "Each key works once. We check it before we send it, and if it will not activate you get a new one or a full refund.",
          "We help with activation for 6 months after you buy.",
        ]}
      />
      <TermsWarning>{WARNING}</TermsWarning>
    </>
  );
}

/** What a buyer decides on, for the listing itself. */
export function KeySummary({
  game,
  platform,
}: {
  game: string;
  platform: Platform | null;
}) {
  const store = (platform && STORES[platform.slug]) || FALLBACK;

  return (
    <TermsPanel title="Terms of use">
      <TermsList
        items={[
          `A genuine ${store.name} key for ${game} that you redeem on your own account. The game is yours for good, and everything online works.`,
          store.redeem,
          "Each key works once. If it will not activate, you get a new one or a full refund.",
        ]}
      />
      <TermsWarning>{WARNING}</TermsWarning>
      <TermsFooter anchor="keys" owner={store.owner} />
    </TermsPanel>
  );
}
