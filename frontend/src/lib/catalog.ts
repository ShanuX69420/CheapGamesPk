import type { Metadata } from "next";
import { cache } from "react";

import { getPlatforms, getProducts, safely, type ProductQuery } from "./api";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "./site";
import type { Paginated, Platform, Product, ProductType } from "./types";

/*
 * The store's middle tier.
 *
 * A section is a view of the catalog with a URL of its own: the whole store
 * at "/", one product type at "/keys", one platform at "/steam". Those are
 * the pages Google gets to rank for "steam offline activation pakistan" —
 * before this, every filter was a query string on "/" that canonicalised
 * back to the homepage, and a search like that had nothing to land on.
 *
 * Everything else a buyer can do to the grid — the other facet, a sort, a
 * search, a page number — rides on the section's URL as a query string. Type
 * wins the path when both facets are set, so Steam offline listings live at
 * "/offline-activations?platform=steam" and nowhere else: one address per
 * view is what keeps every internal link pointing the same way.
 */

export type CatalogParams = Record<string, string | undefined>;

export interface Section {
  /** The route, leading slash included. */
  path: string;
  /** The H1, and the middle rung of a listing's breadcrumb. */
  heading: string;
  /** The <title>, before the brand. */
  title: string;
  description: string;
  /** A paragraph under the H1. The storefront has the hero instead. */
  intro?: string;
  /** What the route pins. The query string cannot override it. */
  facet: { type?: ProductType; platform?: string };
}

export interface TypeSection extends Section {
  facet: { type: ProductType };
  /** Terse, for the tab row and the header. */
  tab: string;
  /** In the header nav. The store sells three things; the fourth is empty. */
  inNav: boolean;
}

export const HOME: Section = {
  path: "/",
  heading: "All products",
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  facet: {},
};

/* The intros carry the words a listing alone does not — "Pakistan", "PKR",
   the payment methods — and say what each kind of listing actually sells.
   They must agree with /faq and the terms panels on the product pages. */
export const TYPE_SECTIONS: TypeSection[] = [
  {
    path: "/offline-activations",
    facet: { type: "offline_account" },
    tab: "Offline",
    inNav: true,
    heading: "Offline activations",
    title: "Steam & PC Offline Activations in Pakistan",
    description:
      "The cheapest way to play a PC game: sign in to an account of ours that owns it, switch to offline mode, and play with your own saves. Priced in PKR, delivered on WhatsApp.",
    intro:
      "The cheapest way to play a PC game in Pakistan. You get login details for a Steam, Ubisoft Connect or EA App account that already owns the game — sign in, download, switch the client to offline mode, and play on one PC with your own saves, for as long as you like. Prices are in PKR; pay by JazzCash, EasyPaisa or bank transfer and the details arrive on WhatsApp, usually within minutes.",
  },
  {
    path: "/online-accounts",
    facet: { type: "online_account" },
    tab: "Online",
    inNav: true,
    heading: "Online accounts",
    title: "Full Access Game Accounts in Pakistan",
    description:
      "Brand-new accounts with the game already on them, sold outright — online play, multiplayer and cloud saves all work. Xbox Game Pass too. Priced in PKR, delivered on WhatsApp.",
    intro:
      "Accounts sold outright, not shared. Each one is brand new and made for the sale, with the game already on it and no hours played — online play, multiplayer, cloud saves and achievements all work as they would on any account of your own. Xbox Game Pass subscriptions are listed here too. Prices are in PKR; pay by JazzCash, EasyPaisa or bank transfer and the login details arrive on WhatsApp.",
  },
  {
    path: "/keys",
    facet: { type: "key" },
    tab: "Keys",
    inNav: true,
    heading: "Game keys",
    title: "Cheap PC Game Keys in Pakistan",
    description:
      "Genuine PC game keys at Pakistani prices — redeem the code on your own account and the game is yours for good. Priced in PKR, delivered on WhatsApp.",
    intro:
      "The simplest thing we sell: a genuine key you redeem on your own account — Steam, or the game's own launcher — so the game is yours outright, with no account of ours involved. Prices are in PKR; pay by JazzCash, EasyPaisa or bank transfer and the key arrives on WhatsApp, with instructions for where to paste it.",
  },
  {
    path: "/subscriptions",
    facet: { type: "subscription" },
    tab: "Subscriptions",
    inNav: false,
    heading: "Subscriptions",
    title: "Game Subscriptions in Pakistan",
    description:
      "PC game subscriptions at Pakistani prices — paid in PKR by JazzCash, EasyPaisa or bank transfer, delivered on WhatsApp.",
    intro:
      "Subscriptions to game services, paid for in PKR by JazzCash, EasyPaisa or bank transfer, with the details delivered on WhatsApp.",
  },
];

export function typeSection(type: string | undefined) {
  return TYPE_SECTIONS.find((s) => s.facet.type === type);
}

export function platformSection(platform: Platform): Section {
  /* "Xbox Game Pass games" and "Rockstar Games games" — some names already
     say it. */
  const named = /game/i.test(platform.name);
  const heading = named ? platform.name : `${platform.name} games`;
  return {
    path: `/${encodeURIComponent(platform.slug)}`,
    facet: { platform: platform.slug },
    heading,
    title: named
      ? `${platform.name} in Pakistan`
      : `Cheap ${platform.name} Games in Pakistan`,
    description: `${heading} at Pakistani prices — priced in PKR, paid by JazzCash, EasyPaisa or bank transfer, and delivered on WhatsApp with setup instructions.`,
    intro: `Every ${platform.name} listing in the store, priced in PKR. Pay by JazzCash, EasyPaisa or bank transfer and your order arrives on WhatsApp with setup instructions.`,
  };
}

/** The section at a top-level path segment — "keys", "steam" — or null. */
export async function resolveSection(slug: string): Promise<Section | null> {
  const byType = TYPE_SECTIONS.find((s) => s.path === `/${slug}`);
  if (byType) return byType;

  const platform = (await loadPlatforms()).find((p) => p.slug === slug);
  return platform ? platformSection(platform) : null;
}

/** Search params arrive as string | string[]; the API only wants scalars. */
export function scalars(
  raw: Record<string, string | string[] | undefined>,
): CatalogParams {
  const out: CatalogParams = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

/** Everything that shapes a view: the route's facet, which the query string
    cannot override, plus whatever the query string adds. */
export function catalogParams(
  section: Section,
  query: CatalogParams,
): CatalogParams {
  return {
    ...query,
    type: section.facet.type ?? typeSection(query.type)?.facet.type,
    platform: section.facet.platform ?? query.platform,
  };
}

/** The one URL for a view. Facets go in the path, the rest in the query. */
export function catalogHref(params: CatalogParams): string {
  const { type, platform, page, ...rest } = params;
  const section = typeSection(type);
  const path = section
    ? section.path
    : platform
      ? `/${encodeURIComponent(platform)}`
      : "/";

  const query = new URLSearchParams();
  if (section && platform) query.set("platform", platform);
  for (const [key, value] of Object.entries(rest)) {
    if (value) query.set(key, value);
  }
  if (page && page !== "1") query.set("page", page);

  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * The URLs the store used before sections were pages — "/?type=key",
 * "/?platform=steam" — and any facet in the query that belongs in the path
 * or contradicts it. Returns where that view lives now, or null.
 */
export function legacyHref(section: Section, query: CatalogParams) {
  const stray =
    query.type !== undefined ||
    (query.platform !== undefined && !section.facet.type);
  return stray ? catalogHref(catalogParams(section, query)) : null;
}

export function pageNumber(raw: string | undefined) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n : 1;
}

export const EMPTY_PAGE: Paginated<Product> = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 24,
  results: [],
};

/* generateMetadata and the page both need the result set, and catalog reads
   are no-store, so Next will not dedupe them. React will, once per request,
   as long as the argument is the same by identity — hence a string key
   rather than the params object. */
const fetchProducts = cache((key: string) =>
  safely(
    getProducts(Object.fromEntries(new URLSearchParams(key)) as ProductQuery),
    EMPTY_PAGE,
  ),
);

const QUERY_KEYS = [
  "search",
  "type",
  "platform",
  "category",
  "on_sale",
  "ordering",
  "page",
] as const;

export function loadProducts(params: CatalogParams) {
  const query = new URLSearchParams();
  for (const key of QUERY_KEYS) {
    const value = params[key];
    if (value) query.set(key, value);
  }
  return fetchProducts(query.toString());
}

export const loadPlatforms = cache(() =>
  safely(getPlatforms(), [] as Platform[]),
);

/**
 * Title, description and canonical for one view of a section.
 *
 * A second facet, a sort or the other filters re-cut the same listings, and
 * the section is the page they all belong to. Page N of the default cut is a
 * page of its own: Google is explicit that pointing it at page 1 is wrong,
 * and page 1 is where most of the catalog is not.
 */
export async function catalogMetadata(
  section: Section,
  query: CatalogParams,
): Promise<Metadata> {
  const params = catalogParams(section, query);

  /* Search results are for the searcher, not the index. */
  if (params.search) return { robots: { index: false, follow: true } };

  const page = pageNumber(params.page);
  const products = await loadProducts(params);
  const base = section.path;
  const recut = Boolean(
    (params.type && params.platform) ||
      params.ordering ||
      params.category ||
      params.on_sale,
  );
  const title = page > 1 ? `${section.title} · Page ${page}` : section.title;

  /* An empty grid is not a page, whichever URL it is under. */
  if (products.results.length === 0) {
    return {
      title: { absolute: `${title} | ${SITE_NAME}` },
      robots: { index: false, follow: true },
    };
  }

  return {
    title: { absolute: `${title} | ${SITE_NAME}` },
    description: section.description,
    alternates: {
      canonical: recut || page === 1 ? base : `${base}?page=${page}`,
    },
  };
}
