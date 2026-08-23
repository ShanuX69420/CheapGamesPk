"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createOrder, StockConflictError } from "@/lib/api";
import { rememberOrder, orderUrl } from "@/lib/orderStore";
import type { Product } from "@/lib/types";

import { useCart } from "./CartProvider";
import { WhatsAppIcon } from "./icons";

export function BuyActions({
  product,
  whatsappEnabled,
}: {
  product: Product;
  whatsappEnabled: boolean;
}) {
  const router = useRouter();
  const { add } = useCart();

  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product.in_stock) {
    return (
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-lg bg-ink-700 px-4 py-3 font-bold text-ink-400"
      >
        Out of stock
      </button>
    );
  }

  function handleAdd() {
    add(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  async function handleWhatsApp() {
    setError(null);
    setBusy(true);

    /* Open the tab synchronously — browsers block window.open() once an await
       has happened, so we claim it first and set the URL after. */
    const tab = window.open("", "_blank");

    try {
      const order = await createOrder({
        items: [{ slug: product.slug, quantity: 1 }],
        source: "whatsapp",
      });

      rememberOrder({
        number: order.number,
        token: order.access_token,
        total: order.total,
        currency: order.currency,
        createdAt: order.created_at,
      });

      if (order.whatsapp_url) {
        if (tab) tab.location.href = order.whatsapp_url;
        else window.location.href = order.whatsapp_url;
      } else {
        tab?.close();
      }

      router.push(orderUrl(order.number, order.access_token));
    } catch (err) {
      tab?.close();
      setError(
        err instanceof StockConflictError
          ? `Only ${err.info.available} left — someone just bought the last one.`
          : "Could not start the order. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-2.5">
      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-bright"
      >
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {whatsappEnabled && (
        <button
          type="button"
          onClick={handleWhatsApp}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-[#04301c] transition hover:bg-[#3ae07a] disabled:cursor-wait disabled:opacity-70"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {busy ? "Starting…" : "Buy now on WhatsApp"}
        </button>
      )}

      {error && (
        <p className="rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal ring-1 ring-deal/25">
          {error}
        </p>
      )}
    </div>
  );
}
