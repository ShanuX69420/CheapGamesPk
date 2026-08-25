import type { Platform } from "@/lib/types";

/* The house rules for the Game Pass accounts. Every one of these listings
   sells the same thing — a Microsoft Store account with a 12-month
   subscription on it — and only the game a buyer arrived looking for changes.
   So what you get, what is excluded and the rules all live here rather than
   being retyped on each product in admin, and a buyer comparing two Game Pass
   listings finds the same account of them on both. */

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

export function GamePassTerms() {
  return (
    <>
      <Panel title="What you get">
        <p className="text-sm leading-relaxed text-ink-200">
          Login details for a Microsoft Store account carrying a 12-month Xbox
          Game Pass subscription, which is access to over 200 games on PC — not
          just the one on this page. Games have no regional restrictions.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          The library includes {INCLUDED.join(", ")}, and many more.
        </p>
        {/* The one line a buyer must not skim, so it is the only coloured
            thing in the panel. */}
        <p className="mt-4 border-t border-ink-800 pt-3 text-sm leading-relaxed text-deal">
          Not supported on this product: {UNSUPPORTED.join(", ")}.
        </p>
      </Panel>

      <Panel title="Terms of use">
        <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
          {TERMS.map((term) => (
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
          endorsed by, or sponsored by Microsoft Corporation, Xbox or Xbox Game
          Pass.
        </p>
      </Panel>
    </>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {title}
      </h2>
      {children}
    </section>
  );
}
