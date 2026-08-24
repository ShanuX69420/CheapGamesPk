import { CURRENCY } from "./format";

/**
 * Google Analytics 4, and the events the store reports through it.
 *
 * The mirror of `lib/pixel.ts`, and split for the same reason — the sale does
 * not finish on the site:
 *
 * - **generate_lead** — the buyer clicks "Buy now on WhatsApp". Reported here,
 *   from the browser. At that point they have only asked; nothing is paid.
 * - **purchase** — you mark the order completed in the admin. Reported by the
 *   server instead (`backend/apps/orders/ga.py`) through the Measurement
 *   Protocol, because by then the buyer is off the site and there is no
 *   browser left to fire anything.
 *
 * The link between the two is the `_ga` cookie gtag writes. `gaAttribution()`
 * reads it at order time and sends it along, so a sale confirmed days later
 * still joins the same visitor — and the same campaign — as the click.
 *
 * **One difference from the pixel, and it matters:** Meta dedupes on
 * `event_id`, so a Lead can safely be sent from both halves. GA4 has no such
 * key and would simply count two of everything, so nothing here is ever
 * repeated by the server. A blocked tag is a lead GA never hears about.
 *
 * Nothing here is required. With `NEXT_PUBLIC_GA_MEASUREMENT_ID` unset the
 * script never loads and every call below returns quietly — as it also does
 * when an ad blocker eats gtag, which must never take the buy button down with
 * it.
 */

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

/** One line of a basket, in the shape GA4 wants to hear about it. */
export interface GaLine {
  slug: string;
  name?: string;
  quantity: number;
  price: number;
}

interface PlacedOrder {
  number: string;
  total: string;
  currency: string;
}

export function gaTrack(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
}

function items(lines: GaLine[]) {
  return lines.map((line) => ({
    item_id: line.slug,
    item_name: line.name ?? line.slug,
    price: line.price,
    quantity: line.quantity,
  }));
}

/**
 * Someone asked to buy — the order exists and WhatsApp is opening.
 *
 * Sent from the browser only. Unlike the pixel's Lead the server never repeats
 * this one, because GA4 would count both copies.
 */
export function gaGenerateLead(order: PlacedOrder, lines: GaLine[]) {
  gaTrack("generate_lead", {
    currency: order.currency,
    value: Number(order.total),
    // Not a sale yet, but it is what the eventual purchase will be keyed on,
    // which is what lets a lead and the money be lined up in a report.
    transaction_id: order.number,
    items: items(lines),
  });
}

export function gaAddToCart(product: {
  slug: string;
  name: string;
  price: string;
}) {
  gaTrack("add_to_cart", {
    currency: CURRENCY,
    value: Number(product.price),
    items: items([
      {
        slug: product.slug,
        name: product.name,
        quantity: 1,
        price: Number(product.price),
      },
    ]),
  });
}

export function gaViewItem(product: {
  slug: string;
  name: string;
  price: string;
}) {
  gaTrack("view_item", {
    currency: CURRENCY,
    value: Number(product.price),
    items: items([
      {
        slug: product.slug,
        name: product.name,
        quantity: 1,
        price: Number(product.price),
      },
    ]),
  });
}

/**
 * The ids that let a sale be credited to a campaign after the buyer has gone.
 *
 * `_ga` names the browser and `_ga_<stream>` the visit it is in the middle of;
 * gtag writes both. Sent with the order so the server can quote them back when
 * the sale is finally confirmed — days later, from the admin, with nothing else
 * left to identify anyone by. Read straight off the cookies rather than asked
 * for through `gtag('get', …)`, which only answers once the tag has loaded and
 * so would keep a buyer waiting on a script an ad blocker may already have
 * eaten.
 */
export function gaAttribution() {
  if (typeof window === "undefined") return {};

  return {
    ga_client_id: clientId(),
    ga_session_id: sessionId(),
  };
}

function readCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

/** `GA1.1.1234567890.1234567890` — the id is the last two parts, joined. */
function clientId() {
  const parts = readCookie("_ga").split(".");
  return parts.length >= 4 ? parts.slice(-2).join(".") : "";
}

/**
 * The current session, out of the per-stream cookie `_ga_<measurement id>`.
 *
 * Google has shipped two layouts for it and rolls between them, so both are
 * read: `GS1` numbers its fields by position, `GS2` packs them into one
 * `$`-separated segment with a letter naming each. A layout we do not
 * recognise costs the session, not the sale — the client id above is what the
 * purchase actually needs.
 */
function sessionId() {
  const body = readCookie(`_ga_${GA_MEASUREMENT_ID.replace(/^G-/, "")}`)
    .split(".")
    .slice(2)
    .join(".");
  if (!body) return "";

  if (body.includes("$")) {
    const field = body.split("$").find((part) => /^s\d+$/.test(part));
    return field ? field.slice(1) : "";
  }

  const first = body.split(".")[0];
  return /^\d+$/.test(first) ? first : "";
}
