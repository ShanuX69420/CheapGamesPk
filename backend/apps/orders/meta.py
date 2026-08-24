"""
Server-side reporting to Meta — the Conversions API behind the Facebook pixel.

The pixel in the browser only sees what happens on the site, and the sale does
not finish there. The buyer clicks through to WhatsApp, pays in the chat, and
we mark the order completed by hand hours or days later. So the two halves are
split: the browser reports the click as a **Lead**, and this module reports the
money as a **Purchase**, sent from the server the moment an order is marked
completed in the admin.

What makes that work is `_fbp`/`_fbc` — the cookies the pixel writes, captured
onto the order when it was created. They are what lets Meta tie a Purchase sent
days later back to the ad click that earned it.

Every event carries an `event_id`. When the browser and the server both report
the same thing Meta keeps one copy, so the ids built here must match the ones
in `frontend/src/lib/pixel.ts`.

None of this is load-bearing. With `META_PIXEL_ID` or `META_CAPI_ACCESS_TOKEN`
unset every call is a no-op, and a rejected or unreachable Graph API is logged
and dropped. An order is never held up, and never fails, because an ad network
did not answer.
"""

import hashlib
import json
import logging
import threading
import urllib.error
import urllib.request

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/{version}/{pixel_id}/events"

# Long enough for a slow round trip, short enough that a hung Graph API cannot
# hold a member of staff hostage in the admin.
TIMEOUT = 8


def is_configured():
    return bool(settings.META_PIXEL_ID and settings.META_CAPI_ACCESS_TOKEN)


# --- events -----------------------------------------------------------------


def lead_event_id(order):
    return f"lead.{order.number}"


def purchase_event_id(order):
    return f"purchase.{order.number}"


def send_lead(order):
    """
    Report that someone asked to buy — fired when the order is written.

    The browser sends its own copy under the same id, so between the two we
    still hear about buyers whose pixel was blocked.
    """
    return _send(order, "Lead", lead_event_id(order), order.created_at)


def send_purchase(order):
    """
    Report the sale itself — fired when an order is marked completed.

    Stamped on success, so re-running the admin action, or marking an order
    completed a second time, cannot report one sale twice. A failure is left
    unstamped and retried the next time it is asked for.
    """
    if order.purchase_event_sent_at:
        return False

    if not _send(order, "Purchase", purchase_event_id(order), order.delivered_at):
        return False

    order.purchase_event_sent_at = timezone.now()
    order.save(update_fields=["purchase_event_sent_at", "updated_at"])
    return True


def send_lead_in_background(order):
    """
    Send a Lead without making the buyer wait for Meta to answer.

    Ordering is the one request where latency is felt: the browser holds an
    empty tab open for the WhatsApp link and cannot fill it until we reply.
    Reporting a lead is not worth a second of that, and if the thread dies with
    the worker the browser has already reported the same event anyway.
    """
    if not is_configured():
        return

    threading.Thread(
        target=send_lead, args=(order,), name=f"meta-lead-{order.number}", daemon=True
    ).start()


# --- payload ----------------------------------------------------------------


def _hashed(value):
    """Personal data has to reach Meta SHA-256'd, lowercased and trimmed."""
    value = (value or "").strip().lower()
    return hashlib.sha256(value.encode()).hexdigest() if value else None


def _hashed_phone(value):
    """
    The same, but a phone has to be digits with a country code and nothing else.

    A number typed the local way (0325...) carries a trunk zero where the
    country code belongs, which is a Pakistani convention rather than a
    universal one — hence the fixed 92. Phones are volunteered in the chat and
    pasted in by hand, so this is a best effort on a field that is usually
    empty.
    """
    digits = "".join(char for char in (value or "") if char.isdigit())
    if digits.startswith("0"):
        digits = "92" + digits.lstrip("0")
    return _hashed(digits)


def _user_data(order):
    """Everything we hold that Meta can match a person on."""
    fields = {
        "em": _hashed(order.email),
        "ph": _hashed_phone(order.phone),
        "fbp": order.fbp,
        "fbc": order.fbc,
        "client_ip_address": order.client_ip,
        "client_user_agent": order.client_user_agent,
        # Ties this order's Lead and Purchase together as one person even when
        # there is no cookie to match on.
        "external_id": _hashed(order.number),
    }
    return {key: value for key, value in fields.items() if value}


def _custom_data(order):
    contents = [
        {
            "id": item.product_slug or str(item.product_id),
            "quantity": item.quantity,
            "item_price": float(item.unit_price),
        }
        for item in order.items.all()
    ]
    return {
        "currency": order.currency,
        "value": float(order.total),
        "content_type": "product",
        "content_ids": [entry["id"] for entry in contents],
        "contents": contents,
        # Meta drops repeat Purchases carrying the same order_id, which is a
        # second guard behind purchase_event_sent_at.
        "order_id": order.number,
    }


def _build(order, event_name, event_id, event_time):
    return {
        "event_name": event_name,
        "event_time": int((event_time or timezone.now()).timestamp()),
        "event_id": event_id,
        # The buyer was on the website when this started, even though a
        # Purchase is confirmed later from the admin. "website" obliges us to
        # send a source URL and a user agent, both captured at order time.
        "action_source": "website",
        "event_source_url": order.source_url or settings.SITE_URL,
        "user_data": _user_data(order),
        "custom_data": _custom_data(order),
    }


# --- transport --------------------------------------------------------------


def _send(order, event_name, event_id, event_time=None):
    if not is_configured():
        return False

    payload = {
        "data": [_build(order, event_name, event_id, event_time)],
        "access_token": settings.META_CAPI_ACCESS_TOKEN,
    }
    # Routes the event to the Test events tab in Events Manager instead of the
    # live dataset. Set it while wiring this up, then take it back out.
    if settings.META_TEST_EVENT_CODE:
        payload["test_event_code"] = settings.META_TEST_EVENT_CODE

    url = GRAPH_URL.format(
        version=settings.META_GRAPH_API_VERSION, pixel_id=settings.META_PIXEL_ID
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        # Graph explains itself in the body and never in the status line, so a
        # log without it says nothing.
        detail = error.read().decode(errors="replace")[:500]
        logger.error(
            "Meta %s for %s rejected (HTTP %s): %s",
            event_name,
            order.number,
            error.code,
            detail,
        )
        return False
    except Exception as error:
        logger.error("Meta %s for %s failed: %s", event_name, order.number, error)
        return False

    logger.info(
        "Meta %s sent for %s (%s received)",
        event_name,
        order.number,
        body.get("events_received"),
    )
    return True
