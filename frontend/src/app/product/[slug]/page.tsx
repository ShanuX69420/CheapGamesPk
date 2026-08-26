import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TrackViewItem } from "@/components/AnalyticsTracker";
import { BuyActions } from "@/components/BuyActions";
import { FullAccessTerms } from "@/components/FullAccessTerms";
import { GamePassTerms, isGamePass } from "@/components/GamePassTerms";
import { KeyTerms } from "@/components/KeyTerms";
import { OfflineTerms } from "@/components/OfflineTerms";
import { TrackViewContent } from "@/components/PixelTracker";
import { FallbackArt, ProductCard } from "@/components/ProductCard";
import { getProduct, getProducts, getStoreConfig, safely } from "@/lib/api";
import { money } from "@/lib/format";
import type { Product, ProductDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

/* Same tinted-text chip as the listing card, so a type reads the same on
   both pages. */
const TYPE_STYLES: Record<string, string> = {
  offline_account: "text-accent-bright",
  online_account: "text-good",
  key: "text-ink-100",
  subscription: "text-amber-300",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found" };

  return {
    title: product.meta_title || product.title,
    description: product.meta_description || product.short_description,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  /* Same account type reads as "more like this" better than genre would —
     a buyer shopping offline accounts wants other offline accounts. */
  const [related, config] = await Promise.all([
    safely(getProducts({ type: product.product_type }), {
      count: 0,
      next: null,
      previous: null,
      page: 1,
      total_pages: 1,
      page_size: 24,
      results: [] as Product[],
    }),
    safely(getStoreConfig(), null),
  ]);
  const alsoLike = related.results
    .filter((p) => p.id !== product.id)
    .slice(0, 6);

  return (
    <div>
      {/* One per network. Neither knows about the other, so either
          can be pulled out on its own. */}
      <TrackViewContent
        slug={product.slug}
        title={product.title}
        price={product.price}
      />
      <TrackViewItem
        slug={product.slug}
        title={product.title}
        price={product.price}
      />
      <Banner product={product} />

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 pt-8">
            {product.description &&
              product.description !== product.short_description && (
                <Section title="About this product">
                  <Prose text={product.description} />
                </Section>
              )}

            {/* Which set of house rules applies is a property of what the
                listing sells, not of the game. Game Pass is a subscription on
                an account we keep; every other online account here is one sold
                outright, fresh and unplayed; a key involves no account of ours
                at all; an offline account is none of those. */}
            {isGamePass(product.platform) ? (
              <GamePassTerms />
            ) : product.product_type === "online_account" ? (
              <FullAccessTerms platform={product.platform} />
            ) : product.product_type === "key" ? (
              <KeyTerms platform={product.platform} />
            ) : (
              product.product_type === "offline_account" && (
                <OfflineTerms platform={product.platform} />
              )
            )}

            {product.system_requirements && (
              <Section title="System requirements">
                <Prose text={product.system_requirements} mono />
              </Section>
            )}
          </div>

          <BuyBox
            product={product}
            whatsappEnabled={Boolean(config?.whatsapp_number)}
          />
        </div>

        {alsoLike.length > 0 && (
          <RelatedProducts
            heading={`More ${product.product_type_display.toLowerCase()}s`}
            products={alsoLike}
          />
        )}
      </div>
    </div>
  );
}

function RelatedProducts({
  heading,
  products,
}: {
  heading: string;
  products: Product[];
}) {
  return (
    <section className="mt-12 border-t border-ink-800 pt-8">
      <h2 className="mb-4 text-base font-semibold">{heading}</h2>
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

/** Wide art behind the title, with the portrait cover sitting on top of it. */
function Banner({ product }: { product: ProductDetail }) {
  const backdrop = product.banner ?? product.image;

  return (
    <div className="relative overflow-hidden border-b border-ink-800">
      {backdrop && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdrop}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl"
          />
          {/* Heavy veil: the backdrop is a hint of the cover's palette, not a
              light show. Text sits on near-flat ink either way. */}
          <div className="absolute inset-0 bg-ink-950/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/50" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6">
        <Link
          href="/"
          className="inline-block text-sm text-ink-200 transition-colors hover:text-ink-50"
        >
          &larr; Back to catalog
        </Link>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-40 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:w-48">
            <div className="aspect-square">
              {product.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <FallbackArt name={product.name} />
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded border border-ink-700 bg-ink-800 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  TYPE_STYLES[product.product_type] ?? "text-ink-200"
                }`}
              >
                {product.product_type_display}
              </span>
              {product.platform && <Chip>{product.platform.name}</Chip>}
              <Chip>{product.region}</Chip>
              {product.release_date && (
                <Chip>{product.release_date.slice(0, 4)}</Chip>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold leading-[1.15] tracking-tight sm:text-[2.1rem]">
              {product.title}
            </h1>

            {product.short_description && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-200">
                {product.short_description}
              </p>
            )}

            {product.categories.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.categories.map((c) => (
                  <Chip key={c.id}>{c.name}</Chip>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-ink-700 bg-ink-800/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-200 backdrop-blur-sm">
      {children}
    </span>
  );
}

function BuyBox({
  product,
  whatsappEnabled,
}: {
  product: ProductDetail;
  whatsappEnabled: boolean;
}) {
  return (
    <aside className="lg:sticky lg:top-20 lg:self-start lg:pt-8">
      <div className="rounded-lg border border-ink-800 bg-ink-900 p-5">
        <span className="text-3xl font-semibold tabular-nums">
          {money(product.price)}
        </span>

        <div className="mt-3 flex items-center gap-1.5 text-sm">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-good" />
          <span className="text-good">In stock</span>
        </div>

        <BuyActions product={product} whatsappEnabled={whatsappEnabled} />

        <ul className="mt-5 space-y-2.5 border-t border-ink-800 pt-4 text-sm text-ink-200">
          <Perk>Fast delivery after payment</Perk>
          <Perk>Setup instructions included</Perk>
          <Perk>Support on activation issues</Perk>
        </ul>
      </div>
    </aside>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden className="mt-0.5 text-good">
        &#10003;
      </span>
      <span>{children}</span>
    </li>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-lg border border-ink-800 bg-ink-900 p-5">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Admin content is plain text with newlines — render the line breaks. */
function Prose({ text, mono }: { text: string; mono?: boolean }) {
  return (
    <div
      className={`space-y-1.5 leading-relaxed text-ink-200 ${
        mono ? "font-mono text-xs" : "text-sm"
      }`}
    >
      {text
        .split("\n")
        .filter((line) => line.trim())
        .map((line, i) => (
          <p key={i}>{line}</p>
        ))}
    </div>
  );
}
