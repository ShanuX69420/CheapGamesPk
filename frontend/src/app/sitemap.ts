import type { MetadataRoute } from "next";

import { getProducts, safely } from "@/lib/api";
import { SITE_URL } from "@/lib/site";
import type { Paginated, Product } from "@/lib/types";

const EMPTY: Paginated<Product> = {
  count: 0,
  next: null,
  previous: null,
  page: 1,
  total_pages: 1,
  page_size: 24,
  results: [],
};

/* Every product page, plus the four pages a buyer can land on. Catalog filter
   views (?type=, ?search=) stay out — they canonicalize to "/" anyway. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const first = await safely(getProducts(), EMPTY);
  const rest = await Promise.all(
    Array.from({ length: first.total_pages - 1 }, (_, i) =>
      safely(getProducts({ page: String(i + 2) }), EMPTY),
    ),
  );
  const products = [first, ...rest].flatMap((page) => page.results);

  return [
    { url: SITE_URL },
    { url: `${SITE_URL}/reviews` },
    { url: `${SITE_URL}/faq` },
    { url: `${SITE_URL}/about` },
    ...products.map((p) => ({ url: `${SITE_URL}/product/${p.slug}` })),
  ];
}
