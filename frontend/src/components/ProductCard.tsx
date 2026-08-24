import Link from "next/link";

import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

/** Offline and online accounts carry different expectations — colour-code them. */
const TYPE_STYLES: Record<string, string> = {
  offline_account: "bg-accent/90 text-white",
  online_account: "bg-good/90 text-ink-950",
  key: "bg-ink-50/90 text-ink-950",
  subscription: "bg-amber-400/90 text-ink-950",
};

/** Full labels collide with the discount badge on narrow cards. */
const TYPE_SHORT: Record<string, string> = {
  offline_account: "Offline",
  online_account: "Online",
  key: "Key",
  subscription: "Sub",
};

export function ProductCard({ product }: { product: Product }) {
  const typeStyle = TYPE_STYLES[product.product_type] ?? "bg-ink-600 text-ink-50";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-ink-900 ring-1 ring-ink-800 transition duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-accent/10 hover:ring-accent/50"
    >
      <div className="relative aspect-square overflow-hidden bg-ink-800">
        {product.image ? (
          /* Artwork is served from an external CDN, so plain <img> avoids
             registering every remote host with next/image. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={product.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <FallbackArt name={product.name} />
        )}

        {/* Scrim only across the bottom strip, so it backs the platform label
            without dulling the artwork. Badges carry their own backgrounds. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/95 via-ink-950/45 to-transparent" />

        {product.is_on_sale && (
          <span className="absolute left-2 top-2 rounded-md bg-deal px-1.5 py-0.5 text-xs font-black tabular-nums text-white shadow-lg">
            −{product.discount_percent}%
          </span>
        )}

        <span
          className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm ${typeStyle}`}
        >
          {TYPE_SHORT[product.product_type] ?? product.product_type_display}
        </span>

        {product.platform && (
          <span className="absolute bottom-2 left-2.5 text-[11px] font-semibold text-ink-200 drop-shadow">
            {product.platform.name}
          </span>
        )}

      </div>

      {/* Fixed height keeps the grid rows aligned regardless of title length. */}
      <div className="flex h-[5.75rem] flex-col justify-between p-3">
        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-50 transition group-hover:text-accent-bright">
          {product.name}
        </h3>

        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black tabular-nums text-ink-50">
            {money(product.price)}
          </span>
          {product.is_on_sale && product.compare_at_price && (
            <span className="text-[11px] tabular-nums text-ink-400 line-through">
              {money(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/** Products without artwork still need to look deliberate, not broken. */
export function FallbackArt({ name }: { name: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_15%,var(--color-ink-700),var(--color-ink-950))] p-4">
      <span
        aria-hidden
        className="absolute -right-6 -top-8 text-[7rem] font-black leading-none text-white/[0.04] select-none"
      >
        {name.charAt(0)}
      </span>
      <span className="relative text-center text-sm font-bold leading-tight text-balance text-ink-200">
        {name}
      </span>
    </div>
  );
}
