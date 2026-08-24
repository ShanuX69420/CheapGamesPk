import Link from "next/link";

type Params = Record<string, string | undefined>;

/**
 * Page numbers with ellipses: always first and last, plus a window around the
 * current page. Returns null entries where a gap should be drawn.
 */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current]);
  for (const offset of [-1, 1]) {
    const page = current + offset;
    if (page > 1 && page < total) pages.add(page);
  }
  // Keep the row a stable width when the current page is near either end.
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => pages.add(p));

  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push(null);
    out.push(page);
    previous = page;
  }
  return out;
}

function hrefFor(params: Params, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") next.set(key, value);
  }
  if (page > 1) next.set("page", String(page));

  const query = next.toString();
  return query ? `/?${query}` : "/";
}

const BASE =
  "flex h-9 min-w-9 items-center justify-center rounded border px-3 text-sm font-medium transition-colors";

/* Every idle control looks the same: hairline box, muted label. The current
   page is the only one that inverts. */
const IDLE = "border-ink-700 text-ink-200 hover:border-ink-600 hover:text-ink-50";
const OFF = "border-ink-800 text-ink-600";

export function Pagination({
  params,
  page,
  totalPages,
}: {
  params: Params;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(params, page - 1)}
          rel="prev"
          className={`${BASE} ${IDLE}`}
        >
          ← Prev
        </Link>
      ) : (
        <span className={`${BASE} cursor-not-allowed ${OFF}`}>
          ← Prev
        </span>
      )}

      {pages.map((entry, i) =>
        entry === null ? (
          <span key={`gap-${i}`} className={`${BASE} border-transparent text-ink-600`} aria-hidden>
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className={`${BASE} border-ink-50 bg-ink-50 text-ink-950`}
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(params, entry)}
            className={`${BASE} ${IDLE}`}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={hrefFor(params, page + 1)}
          rel="next"
          className={`${BASE} ${IDLE}`}
        >
          Next →
        </Link>
      ) : (
        <span className={`${BASE} cursor-not-allowed ${OFF}`}>
          Next →
        </span>
      )}
    </nav>
  );
}
