"""
Transactional email for orders.

Two rules shape this module:

1. Email must never break an order. Every send is wrapped so an SMTP outage
   surfaces as a log line, not a failed checkout.
2. Sending happens off the request thread. A slow SMTP handshake would
   otherwise add seconds to checkout. This is a pragmatic substitute for a
   task queue — at real volume, move `dispatch` onto Celery/RQ.
"""

import logging
import threading

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def order_url(order):
    """Absolute link to the buyer's order page, including its access token."""
    return f"{settings.SITE_URL}/order/{order.number}?token={order.access_token}"


def base_context(**extra):
    return {
        "store_name": settings.STORE_NAME,
        "support_email": settings.STORE_SUPPORT_EMAIL,
        "whatsapp_number": getattr(settings, "WHATSAPP_NUMBER", ""),
        "site_url": settings.SITE_URL,
        **extra,
    }


def dispatch(subject, to, template, context):
    """
    Render and send in a background thread.

    Returns the thread so tests can join it; callers in request handlers
    should ignore it.
    """
    if not to:
        return None

    def run():
        try:
            html = render_to_string(f"emails/{template}.html", context)
            try:
                text = render_to_string(f"emails/{template}.txt", context)
            except Exception:
                text = strip_tags(html)

            message = EmailMultiAlternatives(
                subject=subject,
                body=text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to] if isinstance(to, str) else list(to),
            )
            message.attach_alternative(html, "text/html")
            message.send(fail_silently=False)
        except Exception:
            logger.exception("Failed to send %r to %s", subject, to)

    thread = threading.Thread(target=run, daemon=True, name=f"email:{template}")
    thread.start()
    return thread


def send_order_confirmation(order):
    """Sent the moment an order is placed, with how to pay and where to track it."""
    if not order.email:
        return None

    return dispatch(
        subject=f"{settings.STORE_NAME} — order {order.number} received",
        to=order.email,
        template="order_confirmation",
        context=base_context(
            order=order,
            order_url=order_url(order),
            items=order.items.all(),
        ),
    )


def send_order_delivered(order):
    """Sent once credentials are released."""
    if not order.email:
        return None

    include = settings.ORDER_EMAIL_INCLUDE_CREDENTIALS
    return dispatch(
        subject=f"{settings.STORE_NAME} — order {order.number} is ready",
        to=order.email,
        template="order_delivered",
        context=base_context(
            order=order,
            order_url=order_url(order),
            items=order.items.all(),
            include_credentials=include,
        ),
    )


def send_order_recovery(email, orders):
    """Sent when someone asks for their order links back."""
    return dispatch(
        subject=f"{settings.STORE_NAME} — your order links",
        to=email,
        template="order_recovery",
        context=base_context(
            orders=[{"order": o, "url": order_url(o)} for o in orders],
        ),
    )
