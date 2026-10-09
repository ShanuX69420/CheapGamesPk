import {
  TermsFooter,
  TermsList,
  TermsPanel,
  TermsWarning,
} from "@/components/TermsPanel";
import type { Platform } from "@/lib/types";

/* The house rules for the Game Pass accounts. Every one of these listings
   sells the same thing — a Microsoft Store account with a 12-month
   subscription on it — and only the game a buyer arrived looking for changes.
   So what you get, what is excluded and the rules all live here rather than
   being retyped on each product in admin, and a buyer comparing two Game Pass
   listings finds the same account of them on both. The full rules are on
   /terms; a listing shows what you get and the short version. */

/* A sample of the catalog, not the catalog: Game Pass rotates, so this is
   what is worth naming today. Check it against the live library before adding
   to it. */
const INCLUDED = [
  "The Elder Scrolls IV: Oblivion Remastered",
  "Microsoft Flight Simulator 2024",
  "Forza Horizon 5",
  "Forza Motorsport",
  "Starfield",
];

/* Titles a buyer is likely to go looking for and not find. Said plainly and
   up front, because finding out afterwards is what a refund request is made
   of. */
const UNSUPPORTED = [
  "Minecraft (all versions)",
  "Minecraft Dungeons",
  "Sea of Thieves",
  "Football Manager 26",
  "Sniper Elite 5",
  "Diablo IV",
  "Riot Games titles",
  "Ubisoft+",
  "EA Play",
  "Activision games",
];

const TERMS = [
  "You get the login details for a Microsoft Store account we provide. It is not a game key, and the games are not added to your own Microsoft account.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "You have access to the account for 12 months from the day you buy.",
  "There is no activation code. You activate the games by signing in to the account we send you.",
  "It only works on PCs running Windows 10 or 11, not on Xbox consoles.",
  "You play on your own Xbox Live account, so your nickname and your achievements stay on your own profile. The account we provide is not for use in the Xbox Console Companion app.",
  "Games update automatically, so you never need to reinstall them by hand.",
  "After reinstalling Windows, or removing the account from the Microsoft Store, you can sign back in the same way.",
  "You may not change the account's password or any other detail.",
  "One purchase works on one PC. To play on a second PC, you need to buy it again.",
  "If you change your CPU or motherboard, the access has to be moved. Message us before you change them, not after.",
  "Check that your PC meets the minimum requirements of the game you want. If it does not, that is your responsibility, not ours.",
  "Online play is guaranteed to work as it does on the day you buy. If Microsoft changes it later, we are not responsible.",
  "We help with activation problems for 12 months after you buy, the same 12 months your access lasts.",
  "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
];

const WARNING =
  "If you break any of these rules, we stop the service and you do not get a refund.";

/** Whether a listing is one of the Game Pass accounts these terms describe. */
export function isGamePass(platform: Platform | null) {
  return platform?.slug === "xbox-game-pass";
}

/** The account itself and what it leaves out — on the listing and on /terms. */
export function GamePassContents() {
  return (
    <>
      <p className="text-sm leading-relaxed text-ink-200">
        Login details for a Microsoft Store account with a 12-month Xbox Game
        Pass subscription. That gives you over 200 PC games, not just the one
        you bought it for. There are no region restrictions.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">
        The library includes {INCLUDED.join(", ")}, and many more.
      </p>
      {/* The one line a buyer must not skim, so it is the only coloured
          thing in the panel. */}
      <p className="mt-4 border-t border-ink-800 pt-3 text-sm leading-relaxed text-deal">
        Not supported on this product: {UNSUPPORTED.join(", ")}.
      </p>
    </>
  );
}

/** The full rules, for /terms. */
export function GamePassTerms() {
  return (
    <>
      <TermsList items={TERMS} />
      <TermsWarning>{WARNING}</TermsWarning>
    </>
  );
}

/** What a buyer decides on, for the listing itself. */
export function GamePassSummary() {
  return (
    <>
      <TermsPanel title="What you get">
        <GamePassContents />
      </TermsPanel>

      <TermsPanel title="Terms of use">
        <TermsList
          items={[
            "You get the login details for a Microsoft Store account we provide, with 12 months of Game Pass on it. It is not a key, and nothing is added to your own Microsoft account.",
            "It works on 1 PC running Windows 10 or 11. Xbox consoles are not supported.",
            "Do not change the account's password or details. If you do, the service ends with no refund.",
            "Once the details are sent, the sale is final. If we cannot deliver, you get a full refund.",
          ]}
        />
        <TermsFooter
          anchor="game-pass"
          owner="Microsoft Corporation, Xbox or Xbox Game Pass"
        />
      </TermsPanel>
    </>
  );
}
