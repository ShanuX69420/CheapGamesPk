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
    notifyRemembered();
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

/* Like the cart, remembered orders are external state. Reading them through
   useSyncExternalStore keeps SSR and hydration in agreement without mirroring
   localStorage into React state via an effect. */

const EMPTY: RememberedOrder[] = [];
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedOrders: RememberedOrder[] = EMPTY;

function notify() {
  for (const listener of listeners) listener();
}

/** Callable from rememberOrder, which is declared above this block. */
function notifyRemembered() {
  cachedRaw = null;
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) notify();
}

export const rememberedOrdersStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },

  getSnapshot(): RememberedOrder[] {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return EMPTY;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed = listOrders();
      cachedOrders = parsed.length > 0 ? parsed : EMPTY;
    }
    return cachedOrders;
  },

  getServerSnapshot(): RememberedOrder[] {
    return EMPTY;
  },
};
