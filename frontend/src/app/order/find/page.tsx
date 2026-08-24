"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { orderUrl, rememberedOrdersStore } from "@/lib/orderStore";
import { money } from "@/lib/format";

export default function FindOrderPage() {
  /* Orders placed from this browser are remembered locally. That is the only
     lookup there is — we hold no email address to match anyone against. */
  const recent = useSyncExternalStore(
    rememberedOrdersStore.subscribe,
    rememberedOrdersStore.getSnapshot,
    rememberedOrdersStore.getServerSnapshot,
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight">Find your order</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-400">
        Order links contain a private access code, so we can&rsquo;t look one up
        from a name. Orders you placed on this device are listed below.
      </p>

      {recent.length > 0 ? (
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
      ) : (
        <section className="mt-7 rounded-xl bg-ink-900 p-5 ring-1 ring-ink-800">
          <h2 className="text-sm font-bold">No orders on this device</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-400">
            You either ordered from another phone or browser, or cleared its
            history.
          </p>
        </section>
      )}

      <section className="mt-6 rounded-xl bg-[#25D366]/[0.07] p-5 ring-1 ring-[#25D366]/25">
        <h2 className="text-sm font-bold text-[#3ae07a]">
          Can&rsquo;t find it? Just message us
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-200">
          Every order runs through WhatsApp, so the whole thing is in your chat
          with us — your order number, what you bought and your details. Open
          that chat and we&rsquo;ll sort it out there.
        </p>
      </section>
    </div>
  );
}
