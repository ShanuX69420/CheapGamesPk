import Link from "next/link";

import { money } from "@/lib/format";
import type { Product } from "@/lib/types";

import { Badge, ProductTypeBadge } from "./Badge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-ink-900 ring-1 ring-ink-700 transition hover:ring-accent/60 hover:-translate-y-0.5"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-ink-800">
        {product.image ? (
          // Django serves these; keeping <img> avoids next/image remote-host config for now.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-800 to-ink-700 p-4 text-center">
            <span className="text-sm font-semibold text-ink-400">
              {product.name}
            </span>
          </div>
        )}

        {product.is_on_sale && (
          <div className="absolute left-2 top-2 rounded-md bg-deal px-2 py-1 text-xs font-bold text-white shadow-lg">
            -{product.discount_percent}%
          </div>
        )}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/75 backdrop-blur-[1px]">
            <span className="rounded-md bg-ink-800 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-200 ring-1 ring-ink-600">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex flex-wrap gap-1.5">
          <ProductTypeBadge
            type={product.product_type}
            label={product.product_type_display}
          />
          {product.platform && <Badge tone="muted">{product.platform.name}</Badge>}
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink-50 transition group-hover:text-accent-bright">
          {product.name}
        </h3>

        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-bold text-ink-50">
            {money(product.price)}
          </span>
          {product.is_on_sale && product.compare_at_price && (
            <span className="text-xs text-ink-400 line-through">
              {money(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
