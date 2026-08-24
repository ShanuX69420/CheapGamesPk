"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/components/CartProvider";
import { WhatsAppIcon } from "@/components/icons";
import { WhatsAppHandoff } from "@/components/WhatsAppHandoff";
import { createOrder, getStoreConfig } from "@/lib/api";
import { money } from "@/lib/format";
import { rememberOrder } from "@/lib/orderStore";

export default function CartPage() {
  const { lines, subtotal, count, ready, setQuantity, remove, clear } = useCart();

  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{
    number: string;
    url: string | null;
    opened: boolean;
  } | null>(null);

  useEffect(() => {
    getStoreConfig()
      .then((config) => setWhatsappEnabled(Boolean(config.whatsapp_number)))
      .catch(() => setWhatsappEnabled(false));
  }, []);

  async function handleWhatsApp() {
    setError(null);
    setBusy(true);
    const tab = window.open("", "_blank");

    try {
      const order = await createOrder({
        items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
        source: "whatsapp",
      });

      rememberOrder({
        number: order.number,
        token: order.access_token,
        total: order.total,
        currency: order.currency,
        createdAt: order.created_at,
      });
      clear();

      if (order.whatsapp_url && tab) tab.location.href = order.whatsapp_url;
      else tab?.close();

      /* No redirect: the rest of this sale happens in the chat. */
      setPlaced({
        number: order.number,
        url: order.whatsapp_url,
        opened: Boolean(tab && order.whatsapp_url),
      });
    } catch {
      tab?.close();
      setError("Could not start the order. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) {
    return <Shell>{null}</Shell>;
  }

  /* Ordering empties the cart, so this has to win over the empty state. */
  if (placed) {
    return (
      <Shell>
        <div className="mx-auto max-w-md">
          <WhatsAppHandoff {...placed} />
          <Link
            href="/"
            className="mt-4 block rounded-lg bg-ink-800 px-5 py-2.5 text-center text-sm font-bold text-ink-200 ring-1 ring-ink-700 transition hover:bg-ink-700"
          >
            Keep browsing
          </Link>
        </div>
      </Shell>
    );
  }

  if (count === 0) {
    return (
      <Shell>
        <div className="rounded-xl bg-ink-900 p-16 text-center ring-1 ring-ink-800">
          <p className="text-lg font-bold text-ink-200">Your cart is empty.</p>
          <p className="mt-1.5 text-sm text-ink-400">
            Find something to play and it will show up here.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-bright"
          >
            Browse the catalog
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ul className="space-y-3">
          {lines.map((line) => (
            <li
              key={line.slug}
              className="flex gap-4 rounded-xl bg-ink-900 p-3 ring-1 ring-ink-800"
            >
              <Link
                href={`/product/${line.slug}`}
                className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-800"
              >
                {line.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={line.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/product/${line.slug}`}
                  className="line-clamp-2 text-sm font-semibold transition hover:text-accent-bright"
                >
                  {line.name}
                </Link>
                <p className="mt-1 text-xs text-ink-400">
                  {line.typeLabel}
                  {line.platform ? ` · ${line.platform}` : ""}
                </p>

                <div className="mt-2.5 flex items-center gap-3">
                  <Stepper
                    value={line.quantity}
                    onChange={(next) => setQuantity(line.slug, next)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(line.slug)}
                    className="text-xs text-ink-400 underline-offset-2 transition hover:text-deal hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-bold tabular-nums">
                  {money(Number(line.price) * line.quantity)}
                </p>
                {line.quantity > 1 && (
                  <p className="mt-0.5 text-xs text-ink-400">
                    {money(line.price)} each
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl bg-ink-900 p-5 ring-1 ring-ink-700">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-200">
                Subtotal ({count} {count === 1 ? "item" : "items"})
              </span>
              <span className="text-2xl font-black tabular-nums">
                {money(subtotal)}
              </span>
            </div>

            {whatsappEnabled === false ? (
              <p className="mt-4 rounded-lg bg-ink-800/60 px-3.5 py-3 text-sm leading-relaxed text-ink-200 ring-1 ring-ink-700">
                Ordering runs on WhatsApp and the number isn&apos;t set up yet.
                Please check back shortly.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  disabled={busy || whatsappEnabled === null}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-bold text-[#04301c] shadow-lg shadow-[#25D366]/20 transition hover:bg-[#3ae07a] disabled:cursor-wait disabled:opacity-70"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  {busy ? "Starting…" : "Order on WhatsApp"}
                </button>
                <p className="mt-2 text-center text-xs leading-relaxed text-ink-400">
                  We create your order and open a chat with the details — you
                  agree it and pay there.
                </p>
              </>
            )}

            {error && (
              <p className="mt-3 rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal ring-1 ring-deal/25">
                {error}
              </p>
            )}
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-black tracking-tight">Your cart</h1>
      {children}
    </div>
  );
}

function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center rounded-lg ring-1 ring-ink-700">
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(value - 1)}
        className="px-2.5 py-1 text-ink-200 transition hover:text-accent-bright"
      >
        −
      </button>
      <span className="min-w-7 text-center text-sm font-bold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        disabled={value >= 10}
        className="px-2.5 py-1 text-ink-200 transition hover:text-accent-bright disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
