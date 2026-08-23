from django.conf import settings
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, OrderStatus, OutOfStock, PaymentMethod
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
    """Create an order and hold its stock. No authentication — carts are anonymous."""

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

        try:
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
        except OutOfStock as exc:
            # 409 rather than 400: the request was valid, the world changed.
            return Response(
                {
                    "detail": "Some items sold out while you were checking out.",
                    "product": exc.product.name,
                    "slug": exc.product.slug,
                    "requested": exc.requested,
                    "available": exc.available,
                },
                status=status.HTTP_409_CONFLICT,
            )

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
                "hold_minutes": settings.ORDER_HOLD_MINUTES,
                "order_statuses": dict(OrderStatus.choices),
            }
        )
