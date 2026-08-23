"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/CartProvider";
import {
  createOrder,
  getPaymentMethods,
  StockConflictError,
  ValidationError,
} from "@/lib/api";
import { money } from "@/lib/format";
import { orderUrl, rememberOrder } from "@/lib/orderStore";
import type { PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, count, ready, clear } = useCart();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [method, setMethod] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getPaymentMethods()
      .then((list) => {
        setMethods(list);
        if (list.length > 0) setMethod((current) => current || list[0].slug);
      })
      .catch(() => setMethods([]));
  }, []);

  // An empty cart has nothing to check out — send them back.
  useEffect(() => {
    if (ready && count === 0 && !busy) router.replace("/cart");
  }, [ready, count, busy, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setBusy(true);

    try {
      const order = await createOrder({
        items: lines.map((line) => ({ slug: line.slug, quantity: line.quantity })),
        email,
        phone,
        customer_name: name,
        customer_note: note,
        payment_method: method,
        source: "web",
      });

      rememberOrder({
        number: order.number,
        token: order.access_token,
        total: order.total,
        currency: order.currency,
        createdAt: order.created_at,
      });
      clear();
      router.push(orderUrl(order.number, order.access_token));
    } catch (err) {
      if (err instanceof StockConflictError) {
        setErrors({
          form: `${err.info.product} — only ${err.info.available} left. Go back to your cart and lower the quantity.`,
        });
      } else if (err instanceof ValidationError) {
        const flat: Record<string, string> = {};
        for (const [field, value] of Object.entries(err.fields)) {
          flat[field] = Array.isArray(value) ? String(value[0]) : String(value);
        }
        setErrors(flat);
      } else {
        setErrors({ form: "Something went wrong. Please try again." });
      }
      setBusy(false);
    }
  }

  if (!ready || count === 0) {
    return <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" />;
  }

  const selected = methods.find((m) => m.slug === method);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/cart"
        className="text-sm text-ink-400 transition hover:text-accent-bright"
      >
        ← Back to cart
      </Link>
      <h1 className="mb-6 mt-3 text-2xl font-black tracking-tight">Checkout</h1>

      <form
        onSubmit={handleSubmit}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="space-y-5">
          <Panel title="Your details">
            <Field
              label="Email"
              hint="We send your order and activation details here."
              error={errors.email}
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass(errors.email)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name (optional)">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass()}
                />
              </Field>
              <Field
                label="WhatsApp number (optional)"
                hint="Fastest way for us to reach you."
              >
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX XXXXXXX"
                  className={inputClass(errors.phone)}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="How you'll pay">
            {methods.length === 0 ? (
              <p className="text-sm text-ink-400">
                No payment methods are set up yet. Add them in the admin.
              </p>
            ) : (
              <div className="space-y-2">
                {methods.map((option) => (
                  <label
                    key={option.slug}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 transition ${
                      method === option.slug
                        ? "bg-accent/10 ring-accent/50"
                        : "bg-ink-800/50 ring-ink-700 hover:bg-ink-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={option.slug}
                      checked={method === option.slug}
                      onChange={() => setMethod(option.slug)}
                      className="mt-1 accent-[var(--color-accent)]"
                    />
                    <span className="text-sm font-semibold">{option.name}</span>
                  </label>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-4 rounded-lg bg-ink-950/60 p-3.5 ring-1 ring-ink-700">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">
                  What happens next
                </p>
                <div className="space-y-1 text-sm leading-relaxed text-ink-200">
                  {selected.instructions.split("\n").map((line, i) =>
                    line.trim() ? <p key={i}>{line}</p> : null,
                  )}
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Anything we should know? (optional)">
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A note for us about this order"
              className={`${inputClass()} resize-y`}
            />
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl bg-ink-900 p-5 ring-1 ring-ink-700">
            <h2 className="text-sm font-bold">Order summary</h2>

            <ul className="mt-3 space-y-2 border-b border-ink-800 pb-3">
              {lines.map((line) => (
                <li key={line.slug} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 text-ink-200">
                    <span className="tabular-nums text-ink-400">
                      {line.quantity}×
                    </span>{" "}
                    <span className="line-clamp-1">{line.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {money(Number(line.price) * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-sm text-ink-200">Total</span>
              <span className="text-2xl font-black tabular-nums">
                {money(subtotal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={busy || methods.length === 0}
              className="mt-4 w-full rounded-lg bg-accent px-4 py-3 font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400 disabled:shadow-none"
            >
              {busy ? "Placing order…" : "Place order"}
            </button>

            <p className="mt-2.5 text-center text-xs leading-relaxed text-ink-400">
              We hold your items while you pay. Nothing is charged here — you
              pay using the method above, then we release your order.
            </p>

            {errors.form && (
              <p className="mt-3 rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal ring-1 ring-deal/25">
                {errors.form}
              </p>
            )}
            {errors.items && (
              <p className="mt-3 rounded-lg bg-deal/10 px-3 py-2 text-xs text-deal ring-1 ring-deal/25">
                {errors.items}
              </p>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function inputClass(error?: string) {
  return `w-full rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-ink-50 ring-1 outline-none transition placeholder:text-ink-400 focus:ring-accent ${
    error ? "ring-deal" : "ring-ink-700"
  }`;
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-ink-900 p-5 ring-1 ring-ink-800">
      <h2 className="mb-4 text-sm font-bold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-200">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-deal">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-ink-400">{hint}</span>
      ) : null}
    </label>
  );
}
