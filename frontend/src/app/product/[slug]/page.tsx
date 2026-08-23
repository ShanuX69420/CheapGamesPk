import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, ProductTypeBadge } from "@/components/Badge";
import { getProduct } from "@/lib/api";
import { money } from "@/lib/format";
import type { ProductDetail } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-block text-sm text-ink-400 transition hover:text-accent-bright"
      >
        ← Back to catalog
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <Gallery product={product} />

          <div className="mt-6 flex flex-wrap gap-2">
            <ProductTypeBadge
              type={product.product_type}
              label={product.product_type_display}
            />
            {product.platform && <Badge tone="muted">{product.platform.name}</Badge>}
            <Badge tone="muted">{product.region}</Badge>
            {product.categories.map((c) => (
              <Badge key={c.id} tone="muted">
                {c.name}
              </Badge>
            ))}
          </div>

          <h1 className="mt-4 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            {product.name}
          </h1>

          {product.short_description && (
            <p className="mt-3 text-ink-200">{product.short_description}</p>
          )}

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

        <BuyBox product={product} />
      </div>
    </div>
  );
}

function Gallery({ product }: { product: ProductDetail }) {
  const hero = product.images[0];
  if (!hero) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center rounded-xl bg-gradient-to-br from-ink-800 to-ink-700 p-6 text-center ring-1 ring-ink-700">
        <span className="text-lg font-bold text-ink-400">{product.name}</span>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-ink-700">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hero.image}
        alt={hero.alt_text || product.name}
        className="w-full object-cover"
      />
    </div>
  );
}

function BuyBox({ product }: { product: ProductDetail }) {
  const low = product.stock_count > 0 && product.stock_count <= 3;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-xl bg-ink-900 p-5 ring-1 ring-ink-700">
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-black">{money(product.price)}</span>
          {product.is_on_sale && product.compare_at_price && (
            <>
              <span className="text-sm text-ink-400 line-through">
                {money(product.compare_at_price)}
              </span>
              <span className="rounded-md bg-deal px-1.5 py-0.5 text-xs font-bold text-white">
                -{product.discount_percent}%
              </span>
            </>
          )}
        </div>

        <div className="mt-3 text-sm">
          {product.in_stock ? (
            <span className={low ? "text-deal" : "text-good"}>
              {low
                ? `Only ${product.stock_count} left in stock`
                : `In stock — ${product.stock_count} available`}
            </span>
          ) : (
            <span className="text-ink-400">Out of stock</span>
          )}
        </div>

        <button
          type="button"
          disabled={!product.in_stock}
          className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-bold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400 disabled:shadow-none"
        >
          {product.in_stock ? "Add to cart" : "Out of stock"}
        </button>

        <ul className="mt-5 space-y-2 border-t border-ink-800 pt-4 text-sm text-ink-200">
          <Perk>Instant automatic delivery</Perk>
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
        ✓
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
      className={`mt-8 rounded-xl p-5 ring-1 ${
        tone === "warn"
          ? "bg-deal/5 ring-deal/25"
          : "bg-ink-900/60 ring-ink-800"
      }`}
    >
      <h2
        className={`mb-3 text-sm font-bold uppercase tracking-wider ${
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
      className={`space-y-1.5 text-sm leading-relaxed text-ink-200 ${
        mono ? "font-mono text-xs" : ""
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
