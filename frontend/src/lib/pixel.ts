import { CURRENCY } from "./format";

/**
 * The Meta (Facebook) pixel, and the events the store reports through it.
 *
 * How a sale is counted, and why it takes two halves:
 *
 * - **Lead** — the buyer clicks "Buy now on WhatsApp". Reported here, from the
 *   browser. At that point they have only asked; nothing has been paid.
 * - **Purchase** — you mark the order completed in the admin. Reported by the
 *   server instead (`backend/apps/orders/meta.py`), because by then the buyer
 *   is off the site and there is no browser left to fire anything.
 *
 * The link between the two is `_fbp`/`_fbc`, the cookies this pixel writes.
 * `attribution()` reads them at order time and sends them along so the sale can
 * still be credited to the ad click days later.
 *
 * Nothing here is required. With `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` unset the
 * script never loads and every call below returns quietly — as it also does
 * when an ad blocker eats the pixel, which must never take the buy button down
 * with it.
 */

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ?? "";

/** One line of a basket, in the shape Meta wants to hear about it. */
export interface PixelLine {
  slug: string;
  quantity: number;
  price: number;
}

interface PlacedOrder {
  number: string;
  total: string;
  currency: string;
}

export function track(
  event: string,
  params: Record<string, unknown> = {},
  eventID?: string,
) {
  if (typeof window === "undefined" || !window.fbq) return;

  if (eventID) window.fbq("track", event, params, { eventID });
  else window.fbq("track", event, params);
}

/**
 * Someone asked to buy — the order exists and WhatsApp is opening.
 *
 * The server reports the same event under the same id, so buyers whose pixel
 * was blocked still land in Events Manager and neither copy is counted twice.
 */
export function trackLead(order: PlacedOrder, lines: PixelLine[]) {
  track(
    "Lead",
    {
      content_type: "product",
      content_ids: lines.map((line) => line.slug),
      contents: lines.map((line) => ({
        id: line.slug,
        quantity: line.quantity,
        item_price: line.price,
      })),
      value: Number(order.total),
      currency: order.currency,
      order_id: order.number,
    },
    // Must match lead_event_id() in backend/apps/orders/meta.py.
    `lead.${order.number}`,
  );
}

export function trackAddToCart(product: {
  slug: string;
  name: string;
  price: string;
}) {
  track("AddToCart", {
    content_type: "product",
    content_ids: [product.slug],
    content_name: product.name,
    value: Number(product.price),
    currency: CURRENCY,
  });
}

export function trackViewContent(product: {
  slug: string;
  name: string;
  price: string;
}) {
  track("ViewContent", {
    content_type: "product",
    content_ids: [product.slug],
    content_name: product.name,
    value: Number(product.price),
    currency: CURRENCY,
  });
}

/**
 * The ids that let a sale be credited to an ad long after the buyer has gone.
 *
 * `_fbp` names the browser and `_fbc` the ad click that brought it here; the
 * pixel writes both. Sent with the order so the server can quote them back to
 * Meta when the sale is finally confirmed — days later, from the admin, with
 * nothing else left to identify anyone by.
 */
export function attribution() {
  if (typeof window === "undefined") return {};

  return {
    fbp: readCookie("_fbp"),
    // The pixel writes _fbc when it sees Meta's ?fbclid on the landing URL.
    // If it was blocked, or has not loaded yet, the click id is still in the
    // address bar and the cookie's format is documented, so build it here.
    fbc: readCookie("_fbc") || clickIdFromUrl(),
    source_url: window.location.href,
  };
}

function readCookie(name: string) {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function clickIdFromUrl() {
  const clickId = new URLSearchParams(window.location.search).get("fbclid");
  // fb.<subdomain index>.<when we saw it>.<the id>. Index 1 is a bare domain,
  // which is what cheapgames.pk serves from.
  return clickId ? `fb.1.${Date.now()}.${clickId}` : "";
}
