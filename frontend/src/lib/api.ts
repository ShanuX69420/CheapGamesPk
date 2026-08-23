import type {
  Category,
  Paginated,
  Platform,
  Product,
  ProductDetail,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

/** Seconds before cached catalog data is refetched. Stock changes, so keep it short. */
const REVALIDATE = 60;

export type ProductQuery = {
  search?: string;
  type?: string;
  platform?: string;
  category?: string;
  in_stock?: string;
  on_sale?: string;
  ordering?: string;
  page?: string;
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function get<T>(path: string, params?: Record<string, string | undefined>) {
  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!response.ok) {
    throw new ApiError(`GET ${url.pathname} failed`, response.status);
  }
  return (await response.json()) as T;
}

export function getProducts(query: ProductQuery = {}) {
  return get<Paginated<Product>>("/products/", query);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  try {
    return await get<ProductDetail>(`/products/${slug}/`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function getCategories() {
  return get<Category[]>("/categories/");
}

export function getPlatforms() {
  return get<Platform[]>("/platforms/");
}

/**
 * The storefront is useless without the API, but a connection error during
 * local dev shouldn't blank the whole page — callers render an empty state.
 */
export async function safely<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
