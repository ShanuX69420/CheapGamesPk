"""
Server-side reporting to Google Analytics — the Measurement Protocol behind
gtag.js.

The mirror image of `meta.py`, and for the same reason: the sale does not
finish on the site. The buyer clicks through to WhatsApp, pays in the chat, and
we mark the order completed by hand hours or days later. So gtag reports what
the browser can see — `view_item`, `add_to_cart`, `generate_lead` — and this
module reports the money as a **purchase**, sent the moment an order is marked
completed in the admin.

What makes that work is `ga_client_id`, read off the `_ga` cookie when the
order was placed. It is the name GA knows that browser by, and quoting it back
is the only way a purchase sent from a server days later joins the same
visitor, session and traffic source as the click that earned it. Without one
there is nobody to credit, so the event is not sent at all.

**Nothing is reported from both halves**, which is the one place this differs
from Meta. The Conversions API dedupes on `event_id`, so a Lead can safely be
sent twice; the Measurement Protocol has no such key and would simply count two
of everything. So `generate_lead` is the browser's alone — and a buyer running
an ad blocker is a lead GA never hears about.

None of this is load-bearing. With `GA_MEASUREMENT_ID` or `GA_API_SECRET`
unset every call is a no-op, and an unreachable or complaining endpoint is
logged and dropped. An order is never held up, and never fails, because an
analytics service did not answer.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

COLLECT_URL = "https://www.google-analytics.com/mp/collect"
# Same payload, validated and thrown away instead of recorded. The live
# endpoint answers 204 to anything at all, so this is the only way to find out
# that an event was malformed.
DEBUG_URL = "https://www.google-analytics.com/debug/mp/collect"

# What the admin calls this when it reports back to staff.
NAME = "Google Analytics"

# The column that remembers this network already heard about a sale.
PURCHASE_STAMP = "ga_purchase_event_sent_at"

TIMEOUT = 8


def is_configured():
    return bool(settings.GA_MEASUREMENT_ID and settings.GA_API_SECRET)


def can_report(order):
    """
    Whether this order is one GA could be told about at all.

    Without a client id there is nobody to credit — see `send_purchase`. The
    admin asks first so it does not report a blocked buyer as a failure.
    """
    return bool(order.ga_client_id)


# --- events -----------------------------------------------------------------


def send_purchase(order):
    """
    Report the sale itself — fired when an order is marked completed.

    Stamped on success, so re-running the admin action, or marking an order
    completed a second time, cannot report one sale twice. A failure is left
    unstamped and retried the next time it is asked for.
    """
    if getattr(order, PURCHASE_STAMP):
        return False

    if not order.ga_client_id:
        # Nothing to attach the sale to. GA would either reject it or invent a
        # brand new one-event visitor, which is worse than silence.
        logger.info(
            "Google Analytics purchase for %s skipped: no client id was captured",
            order.number,
        )
        return False

    if not _send(order, _purchase_event(order)):
        return False

    setattr(order, PURCHASE_STAMP, timezone.now())
    order.save(update_fields=[PURCHASE_STAMP, "updated_at"])
    return True


# --- payload ----------------------------------------------------------------


def _items(order):
    return [
        {
            "item_id": item.product_slug or str(item.product_id),
            "item_name": item.product_name,
            "price": float(item.unit_price),
            "quantity": item.quantity,
        }
        for item in order.items.all()
    ]


def _purchase_event(order):
    params = {
        # GA drops a repeat purchase carrying the same transaction_id, which is
        # a second guard behind the stamp above.
        "transaction_id": order.number,
        "currency": order.currency,
        "value": float(order.total),
        "items": _items(order),
        # Without this an event sent from a server counts as a visit with no
        # time spent, and GA leaves it out of most standard reports.
        "engagement_time_msec": 1,
    }
    if order.ga_session_id:
        # Files the sale under the session the buyer actually ordered in, which
        # is what carries the campaign that brought them. Long expired by now —
        # GA accepts it anyway, and attribution is the whole point.
        params["session_id"] = order.ga_session_id
    return {"name": "purchase", "params": params}


def _build(order, event):
    # No timestamp_micros: the Measurement Protocol only backdates 72 hours,
    # and an order confirmed a week late would be silently dropped for it. The
    # sale is stamped when GA receives it, which is when we found out about it.
    return {"client_id": order.ga_client_id, "events": [event]}


# --- transport --------------------------------------------------------------


def _send(order, event):
    if not is_configured():
        return False

    # Validate instead of record while wiring this up. Everything else about
    # the request is identical, so what passes here is what would have landed.
    base = DEBUG_URL if settings.GA_DEBUG else COLLECT_URL
    url = f"{base}?" + urllib.parse.urlencode(
        {
            "measurement_id": settings.GA_MEASUREMENT_ID,
            "api_secret": settings.GA_API_SECRET,
        }
    )
    request = urllib.request.Request(
        url,
        data=json.dumps(_build(order, event)).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            body = response.read().decode(errors="replace")
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:500]
        logger.error(
            "Google Analytics %s for %s rejected (HTTP %s): %s",
            event["name"],
            order.number,
            error.code,
            detail,
        )
        return False
    except Exception as error:
        logger.error(
            "Google Analytics %s for %s failed: %s",
            event["name"],
            order.number,
            error,
        )
        return False

    # The live endpoint answers 204 and an empty body whatever you send it, so
    # there is nothing to check unless we asked to be validated.
    if settings.GA_DEBUG:
        complaints = _complaints(body)
        if complaints:
            logger.error(
                "Google Analytics %s for %s is invalid: %s",
                event["name"],
                order.number,
                complaints,
            )
            return False
        logger.info(
            "Google Analytics %s for %s validated (GA_DEBUG is set — nothing "
            "was recorded)",
            event["name"],
            order.number,
        )
        return True

    logger.info("Google Analytics %s sent for %s", event["name"], order.number)
    return True


def _complaints(body):
    """What the debug endpoint objected to, if anything, as one line."""
    try:
        messages = json.loads(body or "{}").get("validationMessages", [])
    except ValueError:
        return body[:500]
    return "; ".join(
        f"{message.get('fieldPath', '?')}: {message.get('description', message)}"
        for message in messages
    )
