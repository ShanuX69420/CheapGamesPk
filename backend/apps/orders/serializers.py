from urllib.parse import quote

from django.conf import settings
from rest_framework import serializers

from apps.catalog.models import Product

from .models import Order, OrderItem, OrderSource, OrderStatus, PaymentMethod


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = ["id", "name", "slug", "instructions"]


class OrderLineInputSerializer(serializers.Serializer):
    slug = serializers.SlugField()
    quantity = serializers.IntegerField(min_value=1, max_value=10, default=1)


class OrderCreateSerializer(serializers.Serializer):
    """
    Validates a basket before an order is written.

    Quantities are capped per line and per order — this is a shared-account
    store, so a request for fifty units is far more likely to be abuse than
    a real customer.

    Every contact field is optional. The whole sale happens in the WhatsApp
    chat, so the buyer identifies themselves there and we never need a way to
    reach them from here.
    """

    MAX_TOTAL_UNITS = 20

    items = OrderLineInputSerializer(many=True, allow_empty=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    customer_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    customer_note = serializers.CharField(
        max_length=1000, required=False, allow_blank=True
    )
    payment_method = serializers.SlugField(required=False, allow_blank=True)
    source = serializers.ChoiceField(
        choices=OrderSource.choices, default=OrderSource.WEB
    )

    # Ads and analytics attribution, lifted from the browser's cookies by the
    # storefront. Deliberately unconstrained: these are stored, never acted on,
    # and the view trims them to size. A malformed cookie must not be able to
    # fail an order over an ad network's bookkeeping.
    fbp = serializers.CharField(required=False, allow_blank=True)
    fbc = serializers.CharField(required=False, allow_blank=True)
    ga_client_id = serializers.CharField(required=False, allow_blank=True)
    ga_session_id = serializers.CharField(required=False, allow_blank=True)
    source_url = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, value):
        if sum(line["quantity"] for line in value) > self.MAX_TOTAL_UNITS:
            raise serializers.ValidationError(
                f"An order can hold at most {self.MAX_TOTAL_UNITS} units."
            )

        slugs = [line["slug"] for line in value]
        if len(slugs) != len(set(slugs)):
            raise serializers.ValidationError(
                "Each product may only appear once — combine them into one line."
            )
        return value

    def resolve_products(self):
        """Map validated lines to (Product, quantity), rejecting inactive products."""
        lines = self.validated_data["items"]
        found = {
            p.slug: p
            for p in Product.objects.filter(
                slug__in=[line["slug"] for line in lines], is_active=True
            )
        }

        missing = [line["slug"] for line in lines if line["slug"] not in found]
        if missing:
            raise serializers.ValidationError(
                {"items": f"No longer available: {', '.join(missing)}"}
            )
        return [(found[line["slug"]], line["quantity"]) for line in lines]


class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    credentials = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "product_slug",
            "unit_price",
            "quantity",
            "line_total",
            "credentials",
        ]

    def get_credentials(self, obj):
        """
        The payload the buyer paid for — withheld until the order is delivered.

        The parent serializer decides; this only formats. Never widen this
        without checking `Order.credentials_released`.
        """
        if not self.context.get("reveal_credentials"):
            return None
        return [
            {
                "payload": unit.payload,
                "instructions": obj.product.activation_instructions if obj.product else "",
            }
            for unit in obj.stock_items.all()
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_method = PaymentMethodSerializer(read_only=True)
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "number",
            "status",
            "status_display",
            "source",
            "customer_name",
            "email",
            "phone",
            "payment_method",
            "subtotal",
            "total",
            "currency",
            "paid_at",
            "delivered_at",
            "customer_note",
            "items",
            "whatsapp_url",
            "created_at",
        ]

    def get_whatsapp_url(self, obj):
        return build_whatsapp_url(obj)


class OrderCreatedSerializer(OrderSerializer):
    """Adds the access token — returned exactly once, at creation."""

    access_token = serializers.UUIDField(read_only=True)

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["access_token"]


def build_whatsapp_url(order):
    """A wa.me deep link pre-filled with what the buyer is asking about."""
    number = getattr(settings, "WHATSAPP_NUMBER", "")
    if not number:
        return None

    lines = [
        f"Hi! I'd like to buy (order {order.number}):",
        "",
    ]
    for item in order.items.all():
        lines.append(f"• {item.quantity} x {item.product_name} — {order.currency} {item.line_total:.0f}")
    lines += ["", f"Total: {order.currency} {order.total:.0f}"]

    if order.status == OrderStatus.AWAITING_PAYMENT:
        lines.append("Please send payment details.")

    return f"https://wa.me/{number}?text={quote(chr(10).join(lines))}"
