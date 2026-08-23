import { CatalogFilters } from "@/components/CatalogFilters";
import { ProductCard } from "@/components/ProductCard";
import { getPlatforms, getProducts, safely, type ProductQuery } from "@/lib/api";
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
    in_stock: params.in_stock,
    on_sale: params.on_sale,
    ordering: params.ordering,
    page: params.page,
  };

  const empty: Paginated<Product> = {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
  const [page, platforms] = await Promise.all([
    safely(getProducts(query), empty),
    safely(getPlatforms(), []),
  ]);

  const isFiltered = Object.values(params).some(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {!isFiltered && (
        <section className="mb-10 rounded-2xl bg-gradient-to-br from-accent/20 via-ink-900 to-ink-900 p-8 ring-1 ring-accent/20 sm:p-12">
          <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            PC games at a fraction of store price.
          </h1>
          <p className="mt-3 max-w-xl text-ink-200">
            Offline activations, online accounts and genuine keys — delivered
            instantly, with support on every order.
          </p>
        </section>
      )}

      <div className="mb-6">
        <CatalogFilters params={params} platforms={platforms} />
      </div>

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">
          {params.search ? `Results for “${params.search}”` : "All products"}
        </h2>
        <span className="text-sm text-ink-400">
          {page.count} {page.count === 1 ? "product" : "products"}
        </span>
      </div>

      {page.results.length === 0 ? (
        <div className="rounded-xl bg-ink-900 p-12 text-center ring-1 ring-ink-800">
          <p className="font-semibold text-ink-200">Nothing matches that.</p>
          <p className="mt-1 text-sm text-ink-400">
            Try clearing a filter or searching a different title.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {page.results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
