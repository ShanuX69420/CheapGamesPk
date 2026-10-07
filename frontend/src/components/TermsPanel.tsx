import Link from "next/link";

/* The pieces every set of house rules is drawn with — the short version on a
   product page and the full one on /terms alike. */

export function TermsPanel({
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

export function TermsList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-600"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* The one line a buyer must not skim, so it is the only coloured thing in
   the panel. */
export function TermsWarning({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-4 border-t border-ink-800 pt-3 text-sm font-medium text-deal">
      {children}
    </p>
  );
}

/**
 * The foot of a product page's short terms: where the full set lives, and
 * who we are not.
 *
 * The full rules used to be printed on every listing — 200 words, word for
 * word the same on 211 pages, which left Google each page's 50 words about
 * its game to tell them apart. They live once on /terms now, and a listing
 * keeps the few lines a buyer decides on.
 */
export function TermsFooter({ anchor, owner }: { anchor: string; owner: string }) {
  return (
    <div className="mt-4 border-t border-ink-800 pt-3">
      <Link
        href={`/terms#${anchor}`}
        className="text-sm font-medium text-accent-bright transition-colors hover:text-ink-50"
      >
        Read the full terms of use &rarr;
      </Link>
      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        cheapgames.pk is an independent seller and is not affiliated with,
        endorsed by, or sponsored by {owner}.
      </p>
    </div>
  );
}
