/* The house rules for offline activation accounts. Identical on every such
   listing, so it lives here rather than being retyped per product in admin. */
const TERMS = [
  "The account is for offline use only.",
  "Use of the Family Library Sharing feature is prohibited.",
  "Sharing account details with third parties is prohibited.",
  "Any changes to account details are strictly prohibited.",
  "One activation — 1 PC.",
  "The game can be played indefinitely after setting up offline mode.",
  "Your saves are yours to keep, with no time limit on finishing the game.",
  "You can switch back to your own account without any problems.",
  "Any online features of the game will be unavailable.",
  "Activation is not possible for playing via PlayKey, GFN, Google Stadia, Loudplay, Drova, or other cloud services.",
  "Assistance with product issues is available for 365 days from the date of purchase (only activation-related questions).",
];

const WARNING =
  "Any violation of these conditions will result in service denial without a refund.";

export function OfflineTerms() {
  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        Terms of use
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
        {TERMS.map((term) => (
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
    </section>
  );
}
