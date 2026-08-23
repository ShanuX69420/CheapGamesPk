/**
 * The cart lives in localStorage, which is an external store — so it is read
 * through `useSyncExternalStore` rather than mirrored into React state via an
 * effect. That keeps server and client renders consistent during hydration,
 * and syncing on the `storage` event keeps two open tabs in agreement.
 */

const STORAGE_KEY = "cgp.cart.v1";
export const MAX_PER_LINE = 10;

export interface CartLine {
  slug: string;
  name: string;
  price: string;
  image: string | null;
  typeLabel: string;
  platform: string | null;
  quantity: number;
}

const EMPTY: CartLine[] = [];

const listeners = new Set<() => void>();

/* getSnapshot must return a stable reference or React re-renders forever, so
   the parsed value is cached and only rebuilt when the raw string changes. */
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as CartLine;
  return typeof line.slug === "string" && typeof line.quantity === "number";
}

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const lines = parsed.filter(isCartLine);
    return lines.length > 0 ? lines : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key === null || event.key === STORAGE_KEY) emit();
}

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      window.addEventListener("storage", handleStorage);
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        window.removeEventListener("storage", handleStorage);
      }
    };
  },

  getSnapshot(): CartLine[] {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Private mode: behave as an empty cart rather than crashing.
      return EMPTY;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedLines = parse(raw);
    }
    return cachedLines;
  },

  getServerSnapshot(): CartLine[] {
    return EMPTY;
  },

  write(lines: CartLine[]) {
    const raw = JSON.stringify(lines);
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      // Storage full or blocked — keep the in-memory value so the UI still works.
    }
    cachedRaw = raw;
    cachedLines = lines;
    emit();
  },
};

/** True only once React has hydrated — no setState-in-effect required. */
export const hydrationStore = {
  subscribe() {
    return () => {};
  },
  getSnapshot() {
    return true;
  },
  getServerSnapshot() {
    return false;
  },
};
