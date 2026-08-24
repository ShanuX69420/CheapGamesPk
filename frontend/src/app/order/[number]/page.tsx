import type { Metadata } from "next";
import Link from "next/link";

import { WhatsAppIcon } from "@/components/icons";
import { getOrder } from "@/lib/api";
import { money } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

type Props = {
  params: Promise<{ number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* An order page must never be indexed — the URL carries the access token. */
export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

const STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  paid: "bg-accent/15 text-accent-bright ring-accent/30",
  delivered: "bg-good/15 text-good ring-good/30",
  cancelled: "bg-ink-700 text-ink-200 ring-ink-600",
  refunded: "bg-deal/15 text-deal ring-deal/30",
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { number } = await params;
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  if (!token) return <NotFound reason="This link is missing its access code." />;

  const order = await getOrder(number, token).catch(() => null);
  if (!order) return <NotFound reason="We couldn't find that order." />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Order
          </p>
          <h1 className="text-2xl font-black tracking-tight tabular-nums">
            {order.number}
          </h1>
        </div>
        <span
          className={`rounded-lg px-3 py-1.5 text-sm font-bold ring-1 ring-inset ${STATUS_TONE[order.status]}`}
        >
          {order.status_display}
        </span>
      </header>

      <StatusPanel order={order} />

      <section className="mt-6 rounded-xl bg-ink-900 p-5 ring-1 ring-ink-800">
        <h2 className="mb-4 text-sm font-bold">What you ordered</h2>
        <ul className="space-y-4">
          {order.items.map((item) => (
            <li key={item.id} className="border-b border-ink-800 pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between gap-3">
                <Link
                  href={`/product/${item.product_slug}`}
                  className="text-sm font-semibold transition hover:text-accent-bright"
                >
                  <span className="tabular-nums text-ink-400">
                    {item.quantity}×
                  </span>{" "}
                  {item.product_name}
                </Link>
                <span className="shrink-0 font-bold tabular-nums">
                  {money(item.line_total)}
                </span>
              </div>

              {item.credentials && item.credentials.length > 0 && (
                <Credentials credentials={item.credentials} />
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-baseline justify-between border-t border-ink-800 pt-4">
          <span className="text-sm text-ink-200">Total</span>
          <span className="text-xl font-black tabular-nums">
            {money(order.total)}
          </span>
        </div>
      </section>

      <p className="mt-6 rounded-xl bg-ink-900/60 p-4 text-xs leading-relaxed text-ink-400 ring-1 ring-ink-800">
        <strong className="text-ink-200">Keep this link.</strong> It is the only
        way back to this order — there are no accounts, and the code in the URL
        is what unlocks it. Bookmark it or save it somewhere safe.
      </p>
    </div>
  );
}

function StatusPanel({ order }: { order: Order }) {
  const onWhatsApp = order.source === "whatsapp";

  if (order.status === "delivered") {
    return (
      <Panel tone="good" title="Your order is complete">
        {onWhatsApp ? (
          <p>
            We sent your details in the WhatsApp chat. Message us there if
            anything needs sorting.
          </p>
        ) : (
          <p>
            Your details are below. Follow the setup steps exactly — especially
            switching the client to offline mode before launching.
          </p>
        )}
      </Panel>
    );
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    return (
      <Panel tone="muted" title={`Order ${order.status}`}>
        <p>
          This order is no longer active. Get in touch if you think that&rsquo;s
          wrong.
        </p>
      </Panel>
    );
  }

  /* A WhatsApp order is agreed, paid and delivered in the chat, so there is
     no payment step on the site to describe. */
  if (onWhatsApp) {
    return (
      <Panel tone="accent" title="We’re handling this on WhatsApp">
        <p>
          Everything for this order happens in the chat — we&rsquo;ll confirm
          it, take payment and send your details there.
        </p>

        {order.whatsapp_url && (
          <a
            href={order.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#04301c] transition hover:bg-[#3ae07a]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Open the chat
          </a>
        )}
      </Panel>
    );
  }

  if (order.status === "paid") {
    return (
      <Panel tone="accent" title="Payment received">
        <p>
          We&rsquo;re preparing your order now. Refresh this page in a few
          minutes and your details will appear here.
        </p>
      </Panel>
    );
  }

  return (
    <Panel tone="warn" title="Waiting for your payment">
      {order.payment_method ? (
        <>
          <p className="font-semibold text-ink-50">
            Pay with {order.payment_method.name}
          </p>
          <div className="mt-2 space-y-1">
            {order.payment_method.instructions.split("\n").map((line, i) =>
              line.trim() ? <p key={i}>{line}</p> : null,
            )}
          </div>
        </>
      ) : (
        <p>Message us on WhatsApp to arrange payment for this order.</p>
      )}

      <p className="mt-3">
        Quote your order number{" "}
        <strong className="tabular-nums text-ink-50">{order.number}</strong> when
        you pay.
      </p>

      {order.whatsapp_url && (
        <a
          href={order.whatsapp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#04301c] transition hover:bg-[#3ae07a]"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Send payment proof on WhatsApp
        </a>
      )}
    </Panel>
  );
}

function Credentials({
  credentials,
}: {
  credentials: NonNullable<Order["items"][number]["credentials"]>;
}) {
  return (
    <div className="mt-3 space-y-3">
      {credentials.map((credential, i) => (
        <div
          key={i}
          className="rounded-lg bg-good/[0.06] p-3.5 ring-1 ring-good/25"
        >
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-good">
            Your details{credentials.length > 1 ? ` (${i + 1})` : ""}
          </p>
          <pre className="overflow-x-auto rounded bg-ink-950/70 p-2.5 font-mono text-xs text-ink-50 select-all">
            {credential.payload}
          </pre>

          {credential.instructions && (
            <details className="mt-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-ink-200 hover:text-accent-bright">
                Setup instructions
              </summary>
              <div className="mt-2 space-y-1 text-xs leading-relaxed text-ink-200">
                {credential.instructions.split("\n").map((line, j) =>
                  line.trim() ? <p key={j}>{line}</p> : null,
                )}
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function Panel({
  tone,
  title,
  children,
}: {
  tone: "good" | "warn" | "accent" | "muted";
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    good: "bg-good/[0.06] ring-good/25",
    warn: "bg-amber-400/[0.06] ring-amber-400/25",
    accent: "bg-accent/[0.08] ring-accent/25",
    muted: "bg-ink-900 ring-ink-800",
  };
  const headings = {
    good: "text-good",
    warn: "text-amber-300",
    accent: "text-accent-bright",
    muted: "text-ink-200",
  };

  return (
    <section className={`mt-6 rounded-xl p-5 ring-1 ${tones[tone]}`}>
      <h2 className={`mb-2 text-sm font-bold ${headings[tone]}`}>{title}</h2>
      <div className="space-y-1 text-sm leading-relaxed text-ink-200">
        {children}
      </div>
    </section>
  );
}

function NotFound({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-xl font-black">Order not found</h1>
      <p className="mt-2 text-sm text-ink-400">
        {reason} Check that you used the full link we gave you — it includes an
        access code after the order number.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/order/find"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-bright"
        >
          Email me my order link
        </Link>
        <Link
          href="/"
          className="rounded-lg bg-ink-800 px-5 py-2.5 text-sm font-bold text-ink-200 ring-1 ring-ink-700 transition hover:bg-ink-700"
        >
          Back to the store
        </Link>
      </div>
    </div>
  );
}
