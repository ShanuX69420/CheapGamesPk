import type {
  Category,
  CreatedOrder,
  CreateOrderInput,
  Order,
  OutOfStockError,
  Paginated,
  PaymentMethod,
  Platform,
  Product,
  ProductDetail,
  StoreConfig,
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

// --- orders -----------------------------------------------------------------

/** Thrown when the server rejects an order because stock ran out (409). */
export class StockConflictError extends Error {
  constructor(readonly info: OutOfStockError) {
    super(info.detail);
    this.name = "StockConflictError";
  }
}

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

  if (response.status === 409) {
    throw new StockConflictError((await response.json()) as OutOfStockError);
  }
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

export function getPaymentMethods() {
  return get<PaymentMethod[]>("/payment-methods/");
}

export function getStoreConfig() {
  return get<StoreConfig>("/config/");
}
