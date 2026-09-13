import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { CatalogFilters } from "@/components/CatalogFilters";
import { Hero } from "@/components/Hero";
import { JsonLd } from "@/components/JsonLd";
import { Pagination } from "@/components/Pagination";
import { ProductCard } from "@/components/ProductCard";
import { ReviewGallery } from "@/components/ReviewGallery";
import {
  EMPTY_PAGE,
  catalogParams,
  legacyHref,
  loadPlatforms,
  loadProducts,
  pageNumber,
  platformSection,
  typeSection,
  type CatalogParams,
  type Section,
} from "@/lib/catalog";
import { FEATURED_REVIEWS } from "@/lib/reviews";
import { SITE_NAME, SITE_URL, WHATSAPP_CHANNEL_URL } from "@/lib/site";
import type { Platform } from "@/lib/types";

/*
 * Who the site is, said once on the page Google treats as the root.
 *
 * WebSite is what feeds the site name printed above a result — the one part
 * of the old sitelinks-searchbox markup Google still reads. The searchbox
 * itself was retired in November 2024, so there is deliberately no
 * SearchAction here; adding one back buys nothing.
 *
 * OnlineStore is an Organization subtype, which is where the logo belongs.
 */
const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#store` },
    },
    {
      "@type": "OnlineStore",
      "@id": `${SITE_URL}/#store`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      image: `${SITE_URL}/og.png`,
      description:
        "PC games in Pakistan at a fraction of store price — offline activations, Steam accounts and genuine keys, delivered on WhatsApp.",
      areaServed: "PK",
      sameAs: [WHATSAPP_CHANNEL_URL],
    },
  ],
};

/** What the grid is showing, in full: "Steam offline activations". */
function gridLabel(params: CatalogParams, platform: Platform | undefined) {
  const type = typeSection(params.type);
  if (type && platform) return `${platform.name} ${type.heading.toLowerCase()}`;
  if (type) return type.heading;
  if (platform) return platformSection(platform).heading;
  return "All products";
}

/**
 * The grid, its filters and its pagination — the body of the storefront and
 * of every section. Which one this is decides what sits above the grid: the
 * hero on the front page, the section's own H1 and intro everywhere else.
 */
export async function Catalog({
  section,
  query,
}: {
  section: Section;
  query: CatalogParams;
}) {
  const legacy = legacyHref(section, query);
  if (legacy) permanentRedirect(legacy);

  const params = catalogParams(section, query);
  const page = pageNumber(params.page);
  const isSection = section.path !== "/";

  /* The hero and the reviews strip belong to the storefront's front page —
     not to a search, a deeper page, or a section, which opens with its own
     heading instead. */
  const showHero = !isSection && !params.search && page === 1;

  const [results, platforms, featured] = await Promise.all([
    loadProducts(params),
    loadPlatforms(),
    showHero
      ? loadProducts({ ordering: "-created_at" })
      : Promise.resolve(EMPTY_PAGE),
  ]);

  /* Past the last page there is nothing, and nothing should be a 404 rather
     than an empty grid with a canonical of its own. */
  if (page > 1 && results.results.length === 0) notFound();

  const platform = platforms.find((p) => p.slug === params.platform);
  const label = gridLabel(params, platform);
  /* A section already says its own name in the H1. */
  const repeatsHeading = isSection && !params.search && label === section.heading;
  /* Whichever heading is the first on the page is the H1. */
  const Heading = showHero || isSection ? "h2" : "h1";

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
      {isSection ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              {
                "@type": "ListItem",
                position: 2,
                name: section.heading,
                item: `${SITE_URL}${section.path}`,
              },
            ],
          }}
        />
      ) : (
        <JsonLd data={SITE_SCHEMA} />
      )}

      {showHero && <Hero featured={featured.results} />}

      {isSection && (
        <div className="mb-6 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {section.heading}
          </h1>
          {page === 1 && section.intro && (
            <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
              {section.intro}
            </p>
          )}
        </div>
      )}

      <CatalogFilters params={params} platforms={platforms} />

      <div className="mb-4 flex items-baseline justify-between gap-4">
        {repeatsHeading ? (
          <span />
        ) : (
          <Heading className="text-base font-semibold">
            {params.search ? (
              <>
                Results for{" "}
                <span className="text-ink-50">
                  &ldquo;{params.search}&rdquo;
                </span>
              </>
            ) : (
              label
            )}
          </Heading>
        )}
        <span className="shrink-0 text-sm tabular-nums text-ink-400">
          {results.total_pages > 1
            ? `Page ${results.page} of ${results.total_pages} · ${results.count} products`
            : `${results.count} ${results.count === 1 ? "product" : "products"}`}
        </span>
      </div>

      {results.results.length === 0 ? (
        <div className="rounded-lg border border-ink-800 bg-ink-900 p-16 text-center">
          <p className="text-base font-semibold text-ink-50">Nothing matches that.</p>
          <p className="mt-1.5 text-sm text-ink-400">
            Try clearing a filter or searching a different title.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.results.map((product, i) => (
              <ProductCard key={product.id} product={product} eager={i < 6} />
            ))}
          </div>

          <Pagination
            params={params}
            page={results.page}
            totalPages={results.total_pages}
          />
        </>
      )}

      {/* Social proof sits with the hero: on the storefront's front page, but
          out of the way of a search or a deep page. */}
      {showHero && (
        <section className="mt-14">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Reviews from our buyers</h2>
              <p className="mt-1 text-sm text-ink-400">
                Real chats, selling since 2024 — names hidden for privacy. Tap
                to enlarge.
              </p>
            </div>
            <Link
              href="/reviews"
              className="shrink-0 text-sm font-medium text-accent-bright transition-colors hover:text-ink-50"
            >
              View all &rarr;
            </Link>
          </div>
          <ReviewGallery reviews={FEATURED_REVIEWS} layout="strip" />
        </section>
      )}
    </div>
  );
}
