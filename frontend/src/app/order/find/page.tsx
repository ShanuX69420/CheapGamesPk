"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { recoverOrders } from "@/lib/api";
import { orderUrl, rememberedOrdersStore } from "@/lib/orderStore";
import { money } from "@/lib/format";

export default function FindOrderPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Orders placed from this browser are already known locally — show them
  // before making anyone wait on an email.
  const recent = useSyncExternalStore(
    rememberedOrdersStore.subscribe,
    rememberedOrdersStore.getSnapshot,
    rememberedOrdersStore.getServerSnapshot,
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(null);
    setBusy(true);
    try {
      setSent(await recoverOrders(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight">Find your order</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">
        Order links contain a private access code. Orders you placed on this
        device are listed below; otherwise we can only email the link to the
        address on the order.
      </p>

      {recent.length > 0 && (
        <section className="mt-7 rounded-xl bg-ink-900 p-5 ring-1 ring-ink-800">
          <h2 className="text-sm font-bold">Orders from this device</h2>
          <ul className="mt-3 space-y-2">
            {recent.map((order) => (
              <li key={order.number}>
                <Link
                  href={orderUrl(order.number, order.token)}
                  className="flex items-center justify-between gap-3 rounded-lg bg-ink-800/60 px-3.5 py-2.5 text-sm transition hover:bg-ink-800"
                >
                  <span className="font-semibold tabular-nums">
                    {order.number}
                  </span>
                  <span className="text-ink-400 tabular-nums">
                    {money(order.total)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 rounded-xl bg-ink-900 p-5 ring-1 ring-ink-800"
      >
        <h2 className="text-sm font-bold">Email me my order links</h2>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-200">
            Email on your order
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-ink-50 ring-1 ring-ink-700 outline-none transition placeholder:text-ink-400 focus:ring-accent"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-bright disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? "Sending…" : "Send my order links"}
        </button>

        {sent && (
          <p className="mt-3 rounded-lg bg-good/10 px-3 py-2.5 text-sm leading-relaxed text-good ring-1 ring-good/25">
            {sent}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-deal/10 px-3 py-2.5 text-sm text-deal ring-1 ring-deal/25">
            {error}
          </p>
        )}
      </form>

      <p className="mt-6 text-xs leading-relaxed text-ink-400">
        Ordered over WhatsApp and never gave us an email? Message us in the same
        chat — your order number is in the conversation.
      </p>
    </div>
  );
}
