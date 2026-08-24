import Link from "next/link";

import type { Product } from "@/lib/types";

/** A fan of real cover art carries the hero far better than an empty gradient. */
function CoverFan({ products }: { products: Product[] }) {
  const covers = products.filter((p) => p.image).slice(0, 3);
  if (covers.length === 0) return null;

  const ROTATIONS = ["-rotate-6", "rotate-0", "rotate-6"];
  const OFFSETS = ["translate-y-4", "-translate-y-2", "translate-y-5"];

  return (
    <div
      aria-hidden
      className="hidden shrink-0 items-center justify-center gap-3 pr-2 lg:flex"
    >
      {covers.map((product, i) => (
        <div
          key={product.id}
          className={`h-36 w-36 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 transition duration-500 ${ROTATIONS[i]} ${OFFSETS[i]}`}
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

function Trust({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5 text-sm text-ink-200">
      <span aria-hidden className="text-good">
        ✓
      </span>
      {children}
    </li>
  );
}

export function Hero({ featured }: { featured: Product[] }) {
  const best = featured.find((p) => p.is_on_sale);

  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl ring-1 ring-ink-800">
      <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_10%_0%,rgba(124,92,255,0.28),transparent_60%),radial-gradient(60%_100%_at_95%_100%,rgba(47,212,143,0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-ink-900/40" />

      <div className="relative flex items-center justify-between gap-6 px-6 py-9 sm:px-10 sm:py-12">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-bright ring-1 ring-accent/25">
            Fast delivery · 24/7
          </span>

          <h1 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight sm:text-[2.6rem]">
            PC games at a fraction
            <br className="hidden sm:block" /> of store price.
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed text-ink-200">
            Offline activations, online accounts and genuine keys — delivered
            fast once you pay, with support on every order.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
            <Trust>Up to 80% off</Trust>
            <Trust>Setup guide included</Trust>
            <Trust>Real support</Trust>
          </ul>

          {best && (
            <Link
              href={`/product/${best.slug}`}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-bright"
            >
              Today&rsquo;s best deal: {best.name}
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>

        <CoverFan products={featured} />
      </div>
    </section>
  );
}
