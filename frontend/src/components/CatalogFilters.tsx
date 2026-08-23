import Link from "next/link";

import type { Platform } from "@/lib/types";

const TYPES = [
  { value: "", label: "All" },
  { value: "offline_account", label: "Offline account" },
  { value: "online_account", label: "Online account" },
  { value: "key", label: "Game key" },
  { value: "subscription", label: "Subscription" },
];

const SORTS = [
  { value: "", label: "Featured" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "-release_date", label: "Newest releases" },
  { value: "name", label: "A–Z" },
];

type Params = Record<string, string | undefined>;

/** Build a catalog URL with one key changed, dropping pagination. */
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

function Chip({
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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-accent text-white shadow-lg shadow-accent/20"
          : "bg-ink-800 text-ink-200 ring-1 ring-ink-700 hover:bg-ink-700 hover:text-ink-50"
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
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-ink-900/60 p-4 ring-1 ring-ink-800">
      <FilterRow label="Type">
        {TYPES.map((t) => (
          <Chip
            key={t.value}
            href={urlWith(params, "type", t.value)}
            active={(params.type ?? "") === t.value}
          >
            {t.label}
          </Chip>
        ))}
      </FilterRow>

      {platforms.length > 0 && (
        <FilterRow label="Platform">
          <Chip
            href={urlWith(params, "platform", "")}
            active={!params.platform}
          >
            All
          </Chip>
          {platforms.map((p) => (
            <Chip
              key={p.slug}
              href={urlWith(params, "platform", p.slug)}
              active={params.platform === p.slug}
            >
              {p.name}
            </Chip>
          ))}
        </FilterRow>
      )}

      <FilterRow label="Show">
        <Chip
          href={urlWith(params, "in_stock", params.in_stock ? "" : "true")}
          active={params.in_stock === "true"}
        >
          In stock only
        </Chip>
        <Chip
          href={urlWith(params, "on_sale", params.on_sale ? "" : "true")}
          active={params.on_sale === "true"}
        >
          On sale
        </Chip>
      </FilterRow>

      <FilterRow label="Sort">
        {SORTS.map((s) => (
          <Chip
            key={s.value}
            href={urlWith(params, "ordering", s.value)}
            active={(params.ordering ?? "") === s.value}
          >
            {s.label}
          </Chip>
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      {children}
    </div>
  );
}
