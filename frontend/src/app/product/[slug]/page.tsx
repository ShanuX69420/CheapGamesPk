import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TrackViewItem } from "@/components/AnalyticsTracker";
import { BuyActions } from "@/components/BuyActions";
import { FullAccessSummary } from "@/components/FullAccessTerms";
import { GamePassSummary, isGamePass } from "@/components/GamePassTerms";
import { JsonLd } from "@/components/JsonLd";
import { KeySummary } from "@/components/KeyTerms";
import { OfflineSummary } from "@/components/OfflineTerms";
import { TrackViewContent } from "@/components/PixelTracker";
import { FallbackArt, ProductCard } from "@/components/ProductCard";
import {
  getProduct,
  getRelatedProducts,
  getStoreConfig,
  safely,
} from "@/lib/api";
import { typeSection, type Section } from "@/lib/catalog";
import { CURRENCY, money } from "@/lib/format";
import { OG_SITE, SITE_URL } from "@/lib/site";
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

  const description = product.meta_description || describe(product);
  return {
    /* Absolute, so the layout's "— cheapgames.pk" suffix is not appended.
       Google prints the site name above the result already, and a title with
       two separators invites it to rewrite the middle away as boilerplate —
       which is how "Dispatch — Steam Offline Activation" became "Dispatch". */
    title: { absolute: product.meta_title || searchTitle(product) },
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      ...OG_SITE,
      /* The listing's own title: a WhatsApp preview is read by someone who
         has already found the game, not searched for it. */
      title: product.meta_title || product.title,
      description,
      url: `/product/${product.slug}`,
      /* The cover, so a link pasted into WhatsApp shows the game. */
      images: product.image ?? "/og.png",
    },
  };
}

/**
 * The game alone, without what the listing sells: "Cuphead" out of "Cuphead
 * — Steam Offline Activation". Not `name`, which for the listings with no
 * subtitle is the whole title ("Tekken 8 — Full Access Account").
 */
function gameName(product: Product) {
  return product.title.split(" — ")[0];
}

/**
 * "Cuphead Price in Pakistan — Steam Offline Activation", for the <title>.
 *
 * "<game> price in Pakistan" is how buyers here word the search, and the
 * listing title alone matched none of it. The words go straight after the
 * game, not at the end: Google cuts a title at about 60 characters, and what
 * it cuts is the tail. The H1 and the share card keep the listing's own title.
 */
function searchTitle(product: ProductDetail) {
  const [game, ...rest] = product.title.split(" — ");
  return [`${game} Price in Pakistan`, ...rest].join(" — ");
}

/**
 * The snippet for a listing nobody has written one for — all 211 of them.
 *
 * The short description alone read fine and said nothing a buyer here
 * searches by: no price, no "Pakistan", no "PKR". Google cuts a snippet at
 * about 155 characters, so the listing's own facts go first and the payment
 * line last, where losing it costs nothing.
 */
function describe(product: ProductDetail) {
  return [
    `${product.title} for ${money(product.price)} in Pakistan.`,
    product.short_description,
    "Pay by JazzCash, EasyPaisa or bank transfer; delivered on WhatsApp.",
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  /* Same account type, ranked by genre — the API does the ranking, see
     `related` in the catalog views. */
  const [alsoLike, config] = await Promise.all([
    safely(getRelatedProducts(product.slug), [] as Product[]),
    safely(getStoreConfig(), null),
  ]);
  const game = gameName(product);

  /* The section this listing belongs to: "/offline-activations" for an
     offline account. It is the middle rung of the breadcrumb and where the
     back link goes — every listing pointing at its section is most of the
     internal linking the section pages get. */
  const section = typeSection(product.product_type);

  /* Product schema makes the listing eligible for price-rich results. InStock
     is what the buy box says, which is hardcoded too — they agree by design.
     `new URL` absolutizes the image whether the API sent a path or a URL. */
  const url = `${SITE_URL}/product/${product.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.title,
        description: product.meta_description || product.short_description,
        image: product.image
          ? new URL(product.image, SITE_URL).href
          : undefined,
        offers: {
          "@type": "Offer",
          url,
          price: product.price,
          priceCurrency: CURRENCY,
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          ...(section
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: section.heading,
                  item: `${SITE_URL}${section.path}`,
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: section ? 3 : 2,
            name: product.title,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <div>
      <JsonLd data={jsonLd} />
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
      <Banner product={product} section={section} />

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
              <GamePassSummary />
            ) : product.product_type === "online_account" ? (
              <FullAccessSummary game={game} platform={product.platform} />
            ) : product.product_type === "key" ? (
              <KeySummary game={game} platform={product.platform} />
            ) : (
              product.product_type === "offline_account" && (
                <OfflineSummary game={game} platform={product.platform} />
              )
            )}

            {product.system_requirements && (
              <Section title={`${game} system requirements`}>
                <Requirements text={product.system_requirements} />
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
            heading={`More games like ${game}`}
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
function Banner({
  product,
  section,
}: {
  product: ProductDetail;
  section: Section | undefined;
}) {
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
          href={section?.path ?? "/"}
          className="inline-block text-sm text-ink-200 transition-colors hover:text-ink-50"
        >
          &larr;{" "}
          {section ? `All ${section.heading.toLowerCase()}` : "Back to catalog"}
        </Link>

        <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-40 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:w-48">
            <div className="aspect-square">
              {product.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={product.image}
                  alt={product.name}
                  fetchPriority="high"
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
          {/* The only place a listing says where it sells and in what. Neither
              "Pakistan" nor "PKR" appeared anywhere on these pages, and both
              are how buyers word the search that should find them — the price
              renders as "Rs" alone, which nobody types. The three methods must
              agree with /faq and /about, which name the same ones in prose. */}
          <Perk>
            Pakistan price in PKR — JazzCash, EasyPaisa or bank transfer
          </Perk>
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

/**
 * Specs as fetch_requirements writes them: blocks split by a blank line, each
 * headed "Minimum" or "Recommended", then "Label: value" lines — laid out as
 * one column per block. A block with no such heading, or a line with no
 * label, is still shown as written, so specs typed freehand in the admin
 * render too.
 */
function Requirements({ text }: { text: string }) {
  const blocks = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) =>
      block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map((lines) =>
      /^(minimum|recommended)$/i.test(lines[0])
        ? { heading: lines[0], lines: lines.slice(1) }
        : { heading: null, lines },
    );

  return (
    <div className={`grid gap-5 ${blocks.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {blocks.map((block, i) => (
        <div key={i}>
          {block.heading && (
            <h3 className="mb-2 text-sm font-semibold text-ink-100">
              {block.heading}
            </h3>
          )}
          <ul className="space-y-1.5 text-sm leading-relaxed text-ink-200">
            {block.lines.map((line, j) => {
              const label = line.match(/^([^:]{1,30}):\s*(.+)$/);
              return (
                <li key={j}>
                  {label ? (
                    <>
                      <span className="text-ink-400">{label[1]}:</span>{" "}
                      {label[2]}
                    </>
                  ) : (
                    line
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Admin content is plain text with newlines — render the line breaks. */
function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-ink-200">
      {text
        .split("\n")
        .filter((line) => line.trim())
        .map((line, i) => (
          <p key={i}>{line}</p>
        ))}
    </div>
  );
}
