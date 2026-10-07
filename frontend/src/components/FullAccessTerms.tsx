import { TermsFooter, TermsList, TermsPanel } from "@/components/TermsPanel";
import type { Platform } from "@/lib/types";

/* The house rules for the accounts we sell outright. The opposite trade from
   an offline activation: the buyer gets the account itself, fresh and
   unplayed, and everything online works. The full set is the same on every
   such listing, so it lives once, on /terms; a listing shows the short
   version, which names its own game and client. */
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

const TERMS = [
  "You receive the login details for a brand-new account on the client the listing names, made for this sale, with the game already on it and no hours played — not a shared account, and not a key for an account of your own.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "Full access: the account is yours. Online play, multiplayer, cloud saves and achievements all work exactly as they would on any account of your own.",
  "Change the password as soon as you have signed in, and keep the new one somewhere safe.",
  "Move the account's email address to your own whenever you like.",
  "Play on as many of your own PCs as you like. There is no activation limit on an account you own.",
  "The account is sold once, to you. The same details are not handed to anybody else.",
  "Assistance with account questions is available for 6 months from the date of purchase.",
  "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
];

/** The full rules, for /terms. */
export function FullAccessTerms() {
  return <TermsList items={TERMS} />;
}

/** What a buyer decides on, for the listing itself. */
export function FullAccessSummary({
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
          `You get a brand-new ${client.name} account made for this sale, with ${game} already on it — yours outright, not shared with anyone.`,
          "Online play, multiplayer, cloud saves and achievements all work. Change the password as soon as you sign in, and move the email to your own whenever you like.",
          "Once the details are sent the sale is final. If we cannot deliver, you get a full refund.",
        ]}
      />
      <TermsFooter anchor="full-access-accounts" owner={client.owner} />
    </TermsPanel>
  );
}
