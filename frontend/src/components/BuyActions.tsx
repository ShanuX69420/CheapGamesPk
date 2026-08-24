"use client";

import { useState } from "react";

import { createOrder } from "@/lib/api";
import { rememberOrder } from "@/lib/orderStore";
import type { Product } from "@/lib/types";

import { useCart } from "./CartProvider";
import { WhatsAppIcon } from "./icons";
import { WhatsAppHandoff } from "./WhatsAppHandoff";

export function BuyActions({
  product,
  whatsappEnabled,
}: {
  product: Product;
  whatsappEnabled: boolean;
}) {
  const { add } = useCart();

  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{
    number: string;
    url: string | null;
    opened: boolean;
  } | null>(null);

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

      if (order.whatsapp_url && tab) tab.location.href = order.whatsapp_url;
      else tab?.close();

      /* No redirect: the rest of this sale happens in the chat, so the buyer
         stays where they are and we just confirm the order exists. */
      setPlaced({
        number: order.number,
        url: order.whatsapp_url,
        opened: Boolean(tab && order.whatsapp_url),
      });
    } catch {
      tab?.close();
      setError("Could not start the order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-2.5">
      {/* WhatsApp is the only way to buy, so it leads and the cart follows as
          the way to bundle several games into one chat. */}
      {whatsappEnabled &&
        (placed ? (
          <WhatsAppHandoff {...placed} />
        ) : (
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-[#04301c] shadow-lg shadow-[#25D366]/20 transition hover:bg-[#3ae07a] disabled:cursor-wait disabled:opacity-70"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {busy ? "Starting…" : "Buy now on WhatsApp"}
          </button>
        ))}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-lg bg-ink-800 px-4 py-3 font-bold text-ink-100 ring-1 ring-ink-700 transition hover:bg-ink-700 hover:text-ink-50"
      >
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {error && (
        <p className="rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal ring-1 ring-deal/25">
          {error}
        </p>
      )}
    </div>
  );
}
