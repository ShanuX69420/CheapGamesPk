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
  "You receive the login details for an account we provide — this is not a game key, and the game is not added to your own Steam, Ubisoft or EA account.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "The account is for offline use only.",
  "Use of Steam's Family Library Sharing feature is prohibited.",
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

const WARNING =
  "Any violation of these conditions will result in service denial without a refund.";

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
          "The account's details must not be changed or shared with anyone — doing so ends the service without a refund.",
          "Once the details are sent the sale is final. If we cannot deliver, you get a full refund.",
        ]}
      />
      <TermsFooter anchor="offline-activations" owner={client.owner} />
    </TermsPanel>
  );
}
