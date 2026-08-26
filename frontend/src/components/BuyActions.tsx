"use client";

import { useState } from "react";

import { createOrder } from "@/lib/api";
import { gaAddToCart, gaAttribution, gaGenerateLead } from "@/lib/ga";
import { attribution, trackAddToCart, trackLead } from "@/lib/pixel";
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
    trackAddToCart(product);
    gaAddToCart(product);
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
        /* Sent with the order rather than kept here: the sale is confirmed
           days later from the admin, and this is the only chance to record
           which ad click it came from. */
        ...attribution(),
        ...gaAttribution(),
      });

      /* A lead, not a sale — they have asked to buy, and nothing is paid until
         the chat says so. The purchase comes from the server later. */
      trackLead(order, [
        { slug: product.slug, quantity: 1, price: Number(product.price) },
      ]);
      gaGenerateLead(order, [
        {
          slug: product.slug,
          name: product.title,
          quantity: 1,
          price: Number(product.price),
        },
      ]);

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
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-3 font-semibold text-[#04301c] transition-colors hover:bg-[#1fb955] disabled:cursor-wait disabled:opacity-70"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {busy ? "Starting…" : "Buy now on WhatsApp"}
          </button>
        ))}

      <button
        type="button"
        onClick={handleAdd}
        className="w-full rounded-md border border-ink-700 bg-ink-800 px-4 py-3 font-semibold text-ink-100 transition-colors hover:border-ink-600 hover:text-ink-50"
      >
        {added ? "Added to cart ✓" : "Add to cart"}
      </button>

      {error && (
        <p className="rounded-md border border-deal/30 bg-deal/10 px-3 py-2 text-xs text-deal">
          {error}
        </p>
      )}
    </div>
  );
}
