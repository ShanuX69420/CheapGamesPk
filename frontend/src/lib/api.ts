import type {
  Category,
  CreatedOrder,
  CreateOrderInput,
  Order,
  Paginated,
  Platform,
  Product,
  ProductDetail,
  StoreConfig,
} from "./types";

/**
 * Where to reach the API, which differs by who is asking.
 *
 * The browser goes through nginx at the public origin, which is what keeps
 * everything same-origin and CORS out of the picture. A server render is
 * already inside the box, so it talks to gunicorn directly and skips the proxy
 * hop. Both must be absolute — `new URL()` below rejects a bare path.
 */
const API_URL =
  (typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL
    : process.env.NEXT_PUBLIC_API_URL) ?? "http://127.0.0.1:8000/api";

/**
 * Catalog reads are never cached.
 *
 * A timed `revalidate` looks like a free win and is not: Next serves the stale
 * entry to whoever arrives after it expires and only refetches in the
 * background, so the first person through the door sees the previous answer and
 * a reload shows the new one. Editing a price or uploading artwork and then
 * finding the page unchanged until you refresh is that, not a bug in the edit.
 *
 * The catalog is small and Django is a loopback hop away, so paying for it on
 * every render costs a few milliseconds and keeps the store honest about what
 * it is selling. Revisit only with on-demand revalidation, so a write is what
 * clears the cache rather than a clock.
 */
const NO_CACHE = { cache: "no-store" } as const;

export type ProductQuery = {
  search?: string;
  type?: string;
  platform?: string;
  category?: string;
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

  const response = await fetch(url, NO_CACHE);
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

// --- orders -----------------------------------------------------------------

/** Thrown for 400s so forms can surface per-field messages. */
export class ValidationError extends Error {
  constructor(readonly fields: Record<string, unknown>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const response = await fetch(`${API_URL}/orders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (response.status === 400) {
    throw new ValidationError((await response.json()) as Record<string, unknown>);
  }
  if (!response.ok) {
    throw new ApiError("Could not place the order", response.status);
  }
  return (await response.json()) as CreatedOrder;
}

export async function getOrder(
  number: string,
  token: string,
): Promise<Order | null> {
  const url = new URL(`${API_URL}/orders/${number}/`);
  url.searchParams.set("token", token);

  const response = await fetch(url, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new ApiError("Could not load the order", response.status);
  return (await response.json()) as Order;
}

export function getStoreConfig() {
  return get<StoreConfig>("/config/");
}
