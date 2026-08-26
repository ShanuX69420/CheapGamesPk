import Link from "next/link";

import { CatalogFilters, headingForType } from "@/components/CatalogFilters";
import { Hero } from "@/components/Hero";
import { Pagination } from "@/components/Pagination";
import { ProductCard } from "@/components/ProductCard";
import { ReviewGallery } from "@/components/ReviewGallery";
import { getPlatforms, getProducts, safely, type ProductQuery } from "@/lib/api";
import { FEATURED_REVIEWS } from "@/lib/reviews";
import type { Paginated, Product } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Search params arrive as string | string[]; the API only wants scalars. */
function scalars(raw: Record<string, string | string[] | undefined>) {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }
  return out;
}

const EMPTY: Paginated<Product> = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 24,
  results: [],
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = scalars(await searchParams);
  const query: ProductQuery = {
    search: params.search,
    type: params.type,
    platform: params.platform,
    category: params.category,
    on_sale: params.on_sale,
    ordering: params.ordering,
    page: params.page,
  };

  /* The hero is page furniture, not a result: it holds its place while you
     browse tabs and filters, and only steps aside for a search or page 2+. */
  const showHero = !params.search && !(params.page && params.page !== "1");

  const [page, platforms, featured] = await Promise.all([
    safely(getProducts(query), EMPTY),
    safely(getPlatforms(), []),
    showHero
      ? safely(getProducts({ ordering: "-created_at" }), EMPTY)
      : Promise.resolve(EMPTY),
  ]);

  return (
    <div className="mx-auto max-w-[88rem] px-4 py-6 sm:px-6">
      {showHero && <Hero featured={featured.results} />}

      <CatalogFilters params={params} platforms={platforms} />

      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">
          {params.search ? (
            <>
              Results for{" "}
              <span className="text-ink-50">
                &ldquo;{params.search}&rdquo;
              </span>
            </>
          ) : (
            headingForType(params.type)
          )}
        </h2>
        <span className="shrink-0 text-sm tabular-nums text-ink-400">
          {page.total_pages > 1
            ? `Page ${page.page} of ${page.total_pages} · ${page.count} products`
            : `${page.count} ${page.count === 1 ? "product" : "products"}`}
        </span>
      </div>

      {page.results.length === 0 ? (
        <div className="rounded-lg border border-ink-800 bg-ink-900 p-16 text-center">
          <p className="text-base font-semibold text-ink-50">Nothing matches that.</p>
          <p className="mt-1.5 text-sm text-ink-400">
            Try clearing a filter or searching a different title.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {page.results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <Pagination
            params={params}
            page={page.page}
            totalPages={page.total_pages}
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
