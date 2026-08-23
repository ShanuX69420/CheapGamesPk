"use client";

import Link from "next/link";

import { useCart } from "./CartProvider";
import { CartIcon } from "./icons";

export function CartIndicator() {
  const { count, ready } = useCart();

  return (
    <Link
      href="/cart"
      aria-label={`Cart${ready && count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className="relative shrink-0 rounded-lg p-2 text-ink-200 transition hover:bg-ink-800 hover:text-ink-50"
    >
      <CartIcon className="h-5 w-5" />
      {/* Only render the badge after hydration, or SSR and client disagree. */}
      {ready && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black tabular-nums text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
