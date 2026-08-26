"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  cartStore,
  hydrationStore,
  MAX_PER_LINE,
  type CartLine,
} from "@/lib/cartStore";
import type { Product } from "@/lib/types";

export type { CartLine };

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  /** False during SSR and the first hydration pass. */
  ready: boolean;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );
  const ready = useSyncExternalStore(
    hydrationStore.subscribe,
    hydrationStore.getSnapshot,
    hydrationStore.getServerSnapshot,
  );

  const add = useCallback((product: Product, quantity = 1) => {
    const current = cartStore.getSnapshot();
    const existing = current.find((line) => line.slug === product.slug);

    cartStore.write(
      existing
        ? current.map((line) =>
            line.slug === product.slug
              ? {
                  ...line,
                  quantity: Math.min(line.quantity + quantity, MAX_PER_LINE),
                }
              : line,
          )
        : [
            ...current,
            {
              slug: product.slug,
              name: product.title,
              price: product.price,
              image: product.image,
              typeLabel: product.product_type_display,
              platform: product.platform?.name ?? null,
              quantity: Math.min(quantity, MAX_PER_LINE),
            },
          ],
    );
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    const current = cartStore.getSnapshot();
    cartStore.write(
      quantity <= 0
        ? current.filter((line) => line.slug !== slug)
        : current.map((line) =>
            line.slug === slug
              ? { ...line, quantity: Math.min(quantity, MAX_PER_LINE) }
              : line,
          ),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    cartStore.write(cartStore.getSnapshot().filter((line) => line.slug !== slug));
  }, []);

  const clear = useCallback(() => cartStore.write([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.price) * line.quantity,
      0,
    );
    return { lines, count, subtotal, ready, add, setQuantity, remove, clear };
  }, [lines, ready, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}
