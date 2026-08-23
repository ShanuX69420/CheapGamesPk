import Link from "next/link";

import type { Platform } from "@/lib/types";

const TYPES = [
  { value: "", label: "All" },
  { value: "offline_account", label: "Offline" },
  { value: "online_account", label: "Online" },
  { value: "key", label: "Keys" },
  { value: "subscription", label: "Subscriptions" },
];

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
      className={`relative px-1 pb-2.5 text-sm font-bold transition ${
        active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
      )}
    </Link>
  );
}

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
      className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? "bg-accent text-white"
          : "bg-ink-800 text-ink-200 hover:bg-ink-700 hover:text-ink-50"
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
      {/* Product type is the store's primary axis — give it tab weight. */}
      <div className="flex items-center gap-5 overflow-x-auto border-b border-ink-800">
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

        <span className="mx-1 h-4 w-px bg-ink-700" aria-hidden />

        <Pill
          href={urlWith(params, "in_stock", params.in_stock ? "" : "true")}
          active={params.in_stock === "true"}
        >
          In stock
        </Pill>
        <Pill
          href={urlWith(params, "on_sale", params.on_sale ? "" : "true")}
          active={params.on_sale === "true"}
        >
          On sale
        </Pill>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
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
