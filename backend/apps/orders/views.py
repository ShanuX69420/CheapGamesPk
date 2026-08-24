from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .emails import send_order_confirmation, send_order_recovery
from .models import Order, OrderStatus, PaymentMethod
from .serializers import (
    OrderCreateSerializer,
    OrderCreatedSerializer,
    OrderSerializer,
    PaymentMethodSerializer,
)


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
            )

        transaction.on_commit(lambda: send_order_confirmation(order))

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


class OrderRecoverView(APIView):
    """
    Email a buyer the links to their recent orders.

    Always answers the same way whether or not the address has orders — a
    differing response would turn this into an email-enumeration oracle.
    """

    throttle_scope = "order_recover"

    LOOKBACK_DAYS = 120
    MAX_ORDERS = 20

    def post(self, request):
        email = str(request.data.get("email", "")).strip()
        if not email or "@" not in email:
            return Response(
                {"email": "Enter a valid email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orders = list(
            Order.objects.filter(
                email__iexact=email,
                created_at__gte=timezone.now() - timedelta(days=self.LOOKBACK_DAYS),
            ).exclude(status=OrderStatus.CANCELLED)[: self.MAX_ORDERS]
        )

        if orders:
            send_order_recovery(email, orders)

        return Response(
            {
                "detail": "If we have orders for that address, we've just emailed "
                "the links. Check your spam folder too."
            }
        )
