import Link from "next/link";

import type { Platform } from "@/lib/types";

/* Tabs are terse; the heading below them says the same thing in full. */
const TYPES = [
  { value: "", label: "All", heading: "All products" },
  { value: "offline_account", label: "Offline", heading: "Offline accounts" },
  { value: "online_account", label: "Online", heading: "Online accounts" },
  { value: "key", label: "Keys", heading: "Game keys" },
  { value: "subscription", label: "Subscriptions", heading: "Subscriptions" },
];

export function headingForType(type: string | undefined) {
  return TYPES.find((t) => t.value === (type ?? ""))?.heading ?? "All products";
}

const SORTS = [
  { value: "", label: "Featured" },
  { value: "price", label: "Cheapest" },
  { value: "-price", label: "Priciest" },
  { value: "-release_date", label: "Newest" },
];

type Params = Record<string, string | undefined>;

/** Build a catalog URL with one key changed, always resetting pagination. */
function urlWith(current: Params, key: string, value: string) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) {
    if (v && k !== "page") next.set(k, v);
  }
  if (value) next.set(key, value);
  else next.delete(key);

  const query = next.toString();
  return query ? `/?${query}` : "/";
}

/* Filtering isn't navigating away: the row you clicked stays under the cursor
   instead of the page snapping to the top. */
function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`relative px-1 pb-2.5 text-sm font-medium transition-colors ${
        active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 bottom-0 h-px bg-ink-50" />
      )}
    </Link>
  );
}

/* Selected reads as a light chip throughout the site; colour is saved for
   things that take you somewhere. */
function Pill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-ink-50 bg-ink-50 text-ink-950"
          : "border-ink-700 text-ink-200 hover:border-ink-600 hover:text-ink-50"
      }`}
    >
      {children}
    </Link>
  );
}

export function CatalogFilters({
  params,
  platforms,
}: {
  params: Params;
  platforms: Platform[];
}) {
  const activeType = params.type ?? "";

  return (
    <div className="mb-5">
      {/* Product type is the store's primary axis — give it tab weight. The rule
          lives on the wrapper so the scrolling row can hang its active underline
          over it without spilling out and growing a scrollbar. */}
      <div className="border-b border-ink-800">
        <div className="-mb-px flex items-center gap-5 overflow-x-auto">
          {TYPES.map((t) => (
            <Tab
              key={t.value}
              href={urlWith(params, "type", t.value)}
              active={activeType === t.value}
            >
              {t.label}
            </Tab>
          ))}
        </div>
      </div>

      {/* Everything else is secondary: one quiet row. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
        <Pill href={urlWith(params, "platform", "")} active={!params.platform}>
          All platforms
        </Pill>
        {platforms.map((p) => (
          <Pill
            key={p.slug}
            href={urlWith(params, "platform", p.slug)}
            active={params.platform === p.slug}
          >
            {p.name}
          </Pill>
        ))}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">
            Sort
          </span>
          {SORTS.map((s) => (
            <Pill
              key={s.value}
              href={urlWith(params, "ordering", s.value)}
              active={(params.ordering ?? "") === s.value}
            >
              {s.label}
            </Pill>
          ))}
        </div>
      </div>
    </div>
  );
}
