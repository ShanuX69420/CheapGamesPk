import Link from "next/link";

import type { Product } from "@/lib/types";

/** A shelf of real cover art carries the hero far better than an empty panel. */
function CoverShelf({ products }: { products: Product[] }) {
  const covers = products.filter((p) => p.image).slice(0, 3);
  if (covers.length === 0) return null;

  return (
    <div aria-hidden className="hidden shrink-0 items-center gap-3 lg:flex">
      {covers.map((product) => (
        <div
          key={product.id}
          className="h-32 w-32 overflow-hidden rounded-md ring-1 ring-ink-700"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image!}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 8.5l3.5 3.5L13 5" />
    </svg>
  );
}

function Trust({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm text-ink-200">
      <Check className="h-3.5 w-3.5 shrink-0 text-good" />
      {children}
    </li>
  );
}

export function Hero({ featured }: { featured: Product[] }) {
  const best = featured.find((p) => p.is_on_sale);

  return (
    <section className="mb-8 rounded-lg border border-ink-800 bg-ink-900">
      <div className="flex items-center justify-between gap-8 px-6 py-9 sm:px-9 sm:py-11">
        <div className="max-w-xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            Fast delivery · 24/7 support
          </span>

          <h1 className="mt-3 text-3xl font-bold leading-[1.15] tracking-tight sm:text-[2.4rem]">
            PC games at a fraction
            <br className="hidden sm:block" /> of store price.
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
            Offline activations, online accounts and genuine keys — delivered
            fast once you pay, with support on every order.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            <Trust>Up to 80% off</Trust>
            <Trust>Setup guide included</Trust>
            <Trust>Real support</Trust>
          </ul>

          {best && (
            <Link
              href={`/product/${best.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-bright hover:text-ink-950"
            >
              Today&rsquo;s best deal: {best.name}
              <span aria-hidden>&rarr;</span>
            </Link>
          )}
        </div>

        <CoverShelf products={featured} />
      </div>
    </section>
  );
}
