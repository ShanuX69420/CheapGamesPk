import ipaddress

from django.conf import settings
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from . import meta
from .models import Order, OrderStatus, PaymentMethod
from .serializers import (
    OrderCreateSerializer,
    OrderCreatedSerializer,
    OrderSerializer,
    PaymentMethodSerializer,
)


def client_ip(request):
    """
    The buyer's address rather than the proxy's.

    In production every request arrives through nginx on loopback, so
    REMOTE_ADDR is always 127.0.0.1 and the first entry of X-Forwarded-For is
    the real client. Trusting that header is only safe because nothing but
    nginx can reach gunicorn — it is parsed, never used for access control, and
    anything that is not an IP address is dropped.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    candidate = forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def attribution(request, data):
    """
    What Meta will need to recognise this buyer months from now.

    The sale is finished in WhatsApp and confirmed from the admin days later,
    by which point there is no browser left to ask — so whatever identifies
    this one has to be written down now. Everything here is optional and
    trimmed to fit; see apps/orders/meta.py for what it is for.
    """
    return {
        "fbp": data.get("fbp", "")[:128],
        "fbc": data.get("fbc", "")[:255],
        "source_url": data.get("source_url", "")[:500],
        "client_ip": client_ip(request),
        "client_user_agent": request.META.get("HTTP_USER_AGENT", "")[:400],
    }


class PaymentMethodViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    serializer_class = PaymentMethodSerializer
    pagination_class = None
    queryset = PaymentMethod.objects.filter(is_active=True)


class OrderCreateView(APIView):
    """Create an order. No authentication — carts are anonymous."""

    throttle_scope = "order_create"

    def post(self, request):
        form = OrderCreateSerializer(data=request.data)
        form.is_valid(raise_exception=True)

        products = form.resolve_products()
        data = form.validated_data

        method = None
        if data.get("payment_method"):
            method = PaymentMethod.objects.filter(
                slug=data["payment_method"], is_active=True
            ).first()
            if method is None:
                return Response(
                    {"payment_method": "Unknown or inactive payment method."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            order = Order.create_from_items(
                products,
                source=data["source"],
                email=data.get("email", ""),
                phone=data.get("phone", ""),
                customer_name=data.get("customer_name", ""),
                customer_note=data.get("customer_note", ""),
                payment_method=method,
                **attribution(request, data),
            )

        # Fire and forget — the buyer is waiting on this response to open
        # WhatsApp, and the browser reports the same lead itself.
        meta.send_lead_in_background(order)

        payload = OrderCreatedSerializer(order, context={"request": request}).data
        return Response(payload, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """
    Look up an order by number, gated on the access token issued at creation.

    Order numbers are short and therefore guessable, so the token — not the
    number — is what authorises access to credentials.
    """

    def get(self, request, number):
        token = request.query_params.get("token", "")
        order = Order.objects.filter(number=number.upper()).first()

        if order is None or not token or str(order.access_token) != token:
            # Same response either way, so this can't be used to probe numbers.
            return Response(
                {"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND
            )

        context = {
            "request": request,
            "reveal_credentials": order.credentials_released,
        }
        return Response(OrderSerializer(order, context=context).data)


class StoreConfigView(APIView):
    """Public storefront configuration the frontend needs at render time."""

    def get(self, request):
        return Response(
            {
                "currency": settings.STORE_CURRENCY,
                "whatsapp_number": getattr(settings, "WHATSAPP_NUMBER", "") or None,
                "order_statuses": dict(OrderStatus.choices),
            }
        )
