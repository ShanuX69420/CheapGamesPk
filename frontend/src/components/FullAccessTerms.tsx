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
  "You get the login details for a brand-new account on the platform the listing names, made for this sale. The game is already on it, with no hours played. It is not a shared account, and not a key for your own account.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "The account is fully yours. Online play, multiplayer, cloud saves and achievements all work as they would on any account of your own.",
  "Change the password as soon as you have signed in, and keep the new one somewhere safe.",
  "Move the account's email address to your own whenever you like.",
  "Play on as many of your own PCs as you like. There is no activation limit on an account you own.",
  "The account is sold once, to you. Nobody else gets the same details.",
  "We help with account questions for 6 months after you buy.",
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
          `You get a brand-new ${client.name} account made for this sale, with ${game} already on it. It is yours outright and not shared with anyone.`,
          "Online play, multiplayer, cloud saves and achievements all work. Change the password as soon as you sign in, and move the email to your own whenever you like.",
          "Once the details are sent, the sale is final. If we cannot deliver, you get a full refund.",
        ]}
      />
      <TermsFooter anchor="full-access-accounts" owner={client.owner} />
    </TermsPanel>
  );
}
