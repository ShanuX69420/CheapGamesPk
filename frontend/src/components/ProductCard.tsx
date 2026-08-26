import Link from "next/link";

import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Offline and online accounts carry different expectations, so the type is
 * colour-coded — but as tinted text on a dark chip, not a block of colour
 * sitting on the artwork.
 */
const TYPE_STYLES: Record<string, string> = {
  offline_account: "text-accent-bright",
  online_account: "text-good",
  key: "text-ink-100",
  subscription: "text-amber-300",
};

/** Full labels are too wide for a narrow card. */
const TYPE_SHORT: Record<string, string> = {
  offline_account: "Offline",
  online_account: "Online",
  key: "Key",
  subscription: "Sub",
};

export function ProductCard({ product }: { product: Product }) {
  const typeStyle = TYPE_STYLES[product.product_type] ?? "text-ink-200";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-ink-900 transition-colors duration-150 hover:border-ink-600"
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
            className="h-full w-full object-cover"
          />
        ) : (
          <FallbackArt name={product.name} />
        )}

        {/* Scrim only across the bottom strip, so it backs the platform label
            without dulling the artwork. The type chip carries its own. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent" />

        <span
          className={`absolute right-2 top-2 rounded border border-white/10 bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${typeStyle}`}
        >
          {TYPE_SHORT[product.product_type] ?? product.product_type_display}
        </span>

        {product.platform && (
          <span className="absolute bottom-2 left-2.5 text-[11px] font-medium text-ink-200">
            {product.platform.name}
          </span>
        )}
      </div>

      {/* A floor rather than a fixed height: two long lines of name over two of
          subtitle would otherwise push the price out of the card. Growing with
          the row instead keeps every price on the same line across the grid. */}
      <div className="flex min-h-[7rem] flex-1 flex-col justify-between border-t border-ink-800 p-3">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-ink-100 transition-colors group-hover:text-ink-50">
            {product.name}
          </h3>
          {/* The rest of the title. On its own line because a card is too
              narrow to end one — run the two together and the clamp cuts off
              mid-word, which is worse than not saying it at all. */}
          {product.subtitle && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-tight text-ink-400">
              {product.subtitle}
            </p>
          )}
        </div>

        <span className="text-[15px] font-semibold tabular-nums text-ink-50">
          {money(product.price)}
        </span>
      </div>
    </Link>
  );
}

/** Products without artwork still need to look deliberate, not broken. */
export function FallbackArt({ name }: { name: string }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-ink-800 p-4">
      <span
        aria-hidden
        className="absolute -right-5 -top-7 text-[7rem] font-bold leading-none text-white/[0.04] select-none"
      >
        {name.charAt(0)}
      </span>
      <span className="relative text-center text-sm font-medium leading-tight text-balance text-ink-200">
        {name}
      </span>
    </div>
  );
}
