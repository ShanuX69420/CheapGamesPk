/**
 * Remembers order numbers and their access tokens in localStorage.
 *
 * The token is the only way back into an order — there are no accounts — so
 * losing it means losing access to the credentials. We keep a short history
 * so a buyer can find a previous order from the same browser.
 */

const STORAGE_KEY = "cgp.orders.v1";
const MAX_REMEMBERED = 20;

export interface RememberedOrder {
  number: string;
  token: string;
  total: string;
  currency: string;
  createdAt: string;
}

export function rememberOrder(order: RememberedOrder) {
  if (typeof window === "undefined") return;
  try {
    const existing = listOrders().filter((o) => o.number !== order.number);
    const next = [order, ...existing].slice(0, MAX_REMEMBERED);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — the buyer still has the link on screen.
  }
}

export function listOrders(): RememberedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (o): o is RememberedOrder =>
        typeof o === "object" &&
        o !== null &&
        typeof (o as RememberedOrder).number === "string" &&
        typeof (o as RememberedOrder).token === "string",
    );
  } catch {
    return [];
  }
}

export function orderUrl(number: string, token: string) {
  return `/order/${number}?token=${token}`;
}
