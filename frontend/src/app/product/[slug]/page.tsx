import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BuyActions } from "@/components/BuyActions";
import { TrackViewContent } from "@/components/PixelTracker";
import { FallbackArt, ProductCard } from "@/components/ProductCard";
import { getProduct, getProducts, getStoreConfig, safely } from "@/lib/api";
import { money } from "@/lib/format";
import type { Product, ProductDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

const TYPE_STYLES: Record<string, string> = {
  offline_account: "bg-accent text-white",
  online_account: "bg-good text-ink-950",
  key: "bg-ink-50 text-ink-950",
  subscription: "bg-amber-400 text-ink-950",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found" };

  return {
    title: product.meta_title || product.name,
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
      <TrackViewContent
        slug={product.slug}
        name={product.name}
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

            {product.limitations && (
              <Section title="What does not work" tone="warn">
                <Prose text={product.limitations} />
              </Section>
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
      <h2 className="mb-4 text-base font-bold">{heading}</h2>
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
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl saturate-[1.7]"
          />
          {/* Enough veil for text contrast, but the artwork still carries colour. */}
          <div className="absolute inset-0 bg-ink-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6">
        <Link
          href="/"
          className="inline-block text-sm text-ink-200 transition hover:text-accent-bright"
        >
          &larr; Back to catalog
        </Link>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-40 shrink-0 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 sm:w-48">
            <div className="aspect-[2/3]">
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
                className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                  TYPE_STYLES[product.product_type] ?? "bg-ink-600 text-ink-50"
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

            <h1 className="mt-3 text-2xl font-black leading-[1.15] tracking-tight sm:text-4xl">
              {product.name}
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
    <span className="rounded-md bg-ink-50/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-200 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
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
  const saving =
    product.compare_at_price !== null
      ? Number(product.compare_at_price) - Number(product.price)
      : 0;

  return (
    <aside className="lg:sticky lg:top-20 lg:self-start lg:pt-8">
      <div className="rounded-xl bg-ink-900 p-5 ring-1 ring-ink-700">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-3xl font-black tabular-nums">
            {money(product.price)}
          </span>
          {product.is_on_sale && product.compare_at_price && (
            <>
              <span className="text-sm tabular-nums text-ink-400 line-through">
                {money(product.compare_at_price)}
              </span>
              <span className="rounded-md bg-deal px-1.5 py-0.5 text-xs font-black text-white">
                &minus;{product.discount_percent}%
              </span>
            </>
          )}
        </div>

        {saving > 0 && (
          <p className="mt-1.5 text-xs text-good">You save {money(saving)}</p>
        )}

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
  tone,
  children,
}: {
  title: string;
  tone?: "warn";
  children: React.ReactNode;
}) {
  return (
    <section
      className={`mb-5 rounded-xl p-5 ring-1 ${
        tone === "warn"
          ? "bg-deal/[0.06] ring-deal/25"
          : "bg-ink-900/70 ring-ink-800"
      }`}
    >
      <h2
        className={`mb-3 text-xs font-bold uppercase tracking-wider ${
          tone === "warn" ? "text-deal" : "text-ink-400"
        }`}
      >
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
