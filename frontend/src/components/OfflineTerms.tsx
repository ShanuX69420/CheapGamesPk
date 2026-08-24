/* The house rules for offline activation accounts. Identical on every such
   listing, so it lives here rather than being retyped per product in admin. */
const TERMS = [
  "The account is for offline use only.",
  "Use of the Family Library Sharing feature is prohibited.",
  "Sharing account details with third parties is prohibited.",
  "Any changes to account details are strictly prohibited.",
  "One activation — 1 PC.",
  "The game can be played indefinitely after setting up offline mode.",
  "Any online features of the game will be unavailable.",
  "Activation is not possible for playing via PlayKey, GFN, Google Stadia, Loudplay, Drova, or other cloud services.",
  "Assistance with product issues is available for 365 days from the date of purchase (only activation-related questions).",
];

const WARNING =
  "Any violation of these conditions will result in service denial without a refund.";

export function OfflineTerms() {
  return (
    <section className="mb-5 rounded-xl bg-deal/[0.06] p-5 ring-1 ring-deal/25">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-deal">
        <span aria-hidden>&#128276;</span> Important information
      </h2>
      <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
        {TERMS.map((term) => (
          <li key={term} className="flex items-start gap-2">
            <span aria-hidden className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-deal" />
            <span>{term}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-deal/20 pt-3 text-sm font-semibold text-deal">
        {WARNING}
      </p>
    </section>
  );
}
