import {
  TermsFooter,
  TermsList,
  TermsPanel,
  TermsWarning,
} from "@/components/TermsPanel";
import type { Platform } from "@/lib/types";

/* The house rules for offline activation accounts. The full set is the same
   on every such listing, so it lives once, on /terms; a listing shows the
   short version, which names its own game and client. */
type Client = {
  /* What the buyer calls the account of their own that this one is not. */
  account: string;
  /* Who we disclaim any affiliation with. */
  owner: string;
};

const CLIENTS: Record<string, Client> = {
  steam: { account: "Steam", owner: "Valve Corporation or Steam" },
  "ea-app": { account: "EA", owner: "Electronic Arts" },
  "ubisoft-connect": { account: "Ubisoft", owner: "Ubisoft Entertainment" },
  "microsoft-store": { account: "Microsoft", owner: "Microsoft Corporation" },
  "epic-games": { account: "Epic Games", owner: "Epic Games, Inc." },
};

/* Steam is the catalog's default platform, so it is what a listing with none
   set is selling. */
const FALLBACK = CLIENTS.steam;

const TERMS = [
  "You get the login details for an account we provide. It is not a game key, and the game is not added to your own Steam, Ubisoft or EA account.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "The account is for offline use only.",
  "You may not use Steam Family Library Sharing on the account.",
  "You may not share the account details with anyone else.",
  "You may not change any of the account's details.",
  "One purchase works on one PC.",
  "Once offline mode is set up, you can play for as long as you like.",
  "Your saves are yours to keep, and there is no deadline for finishing the game.",
  "You can switch back to your own account whenever you want.",
  "The game's online features will not work.",
  "It cannot be played through cloud gaming services such as PlayKey, GeForce Now, Loudplay or Drova.",
  "We help with activation problems for 6 months after you buy.",
  "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
];

const WARNING =
  "If you break any of these rules, we stop the service and you do not get a refund.";

/** The full rules, for /terms. */
export function OfflineTerms() {
  return (
    <>
      <TermsList items={TERMS} />
      <TermsWarning>{WARNING}</TermsWarning>
    </>
  );
}

/** What a buyer decides on, for the listing itself. */
export function OfflineSummary({
  game,
  platform,
}: {
  game: string;
  platform: Platform | null;
}) {
  const client = (platform && CLIENTS[platform.slug]) || FALLBACK;

  return (
    <TermsPanel title="Terms of use">
      <TermsList
        items={[
          `You get the login details for a ${client.account} account of ours that owns ${game}. It is not a key, and the game is not added to your own account.`,
          "You play in offline mode on 1 PC, with your own saves, for as long as you like. Online features do not work.",
          "Do not change the account's details or share them with anyone. If you do, the service ends with no refund.",
          "Once the details are sent, the sale is final. If we cannot deliver, you get a full refund.",
        ]}
      />
      <TermsFooter anchor="offline-activations" owner={client.owner} />
    </TermsPanel>
  );
}
