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
  "You receive the login details for a Microsoft Store account we provide — this is not a game key, and the games are not added to your own Microsoft account.",
  "Details are sent to you on WhatsApp as soon as your payment is confirmed.",
  "Access to the account is provided for 12 months from the date of purchase.",
  "Activation codes are not provided; the game is activated by signing into the account we send you.",
  "Activation works only on PCs running Windows 10 or 11. Xbox consoles are not supported.",
  "You play on your own Xbox Live account, so your nickname and your achievements stay on your own profile. The account we provide is not for use in the Xbox Console Companion app.",
  "Games update themselves — nothing to reinstall by hand.",
  "After reinstalling Windows, or removing the account from the Microsoft Store, you can sign back in the same way.",
  "Changing the account password or any other account detail is strictly prohibited.",
  "One purchase — 1 PC. Playing on a second PC means buying the product again.",
  "Changing your CPU or motherboard means the access has to be moved — message us before you do it, not after.",
  "Check that your PC meets the minimum requirements of the game you are buying for. If it does not, the purchase is on you.",
  "Online play is guaranteed as it works on the day you buy. If Microsoft changes it later, we cannot take claims for that.",
  "Assistance with product issues is available for 12 months from the date of purchase (only activation-related questions) — the same 12 months the access itself runs for.",
  "Once the account details have been sent, the sale is final. If we cannot deliver, you get a full refund.",
];

const WARNING =
  "Any violation of these conditions will result in service denial without a refund.";

/** Whether a listing is one of the Game Pass accounts these terms describe. */
export function isGamePass(platform: Platform | null) {
  return platform?.slug === "xbox-game-pass";
}

/** The account itself and what it leaves out — on the listing and on /terms. */
export function GamePassContents() {
  return (
    <>
      <p className="text-sm leading-relaxed text-ink-200">
        Login details for a Microsoft Store account carrying a 12-month Xbox
        Game Pass subscription, which is access to over 200 games on PC — not
        just the one you bought it for. Games have no regional restrictions.
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
            "The account's password and details must not be changed — doing so ends the service without a refund.",
            "Once the details are sent the sale is final. If we cannot deliver, you get a full refund.",
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
