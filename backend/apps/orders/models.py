import secrets
import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from apps.catalog.models import Product, TimeStampedModel
from apps.inventory.models import StockItem, StockStatus

ORDER_NUMBER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no look-alikes
ORDER_NUMBER_PREFIX = "CGP"


class OutOfStock(Exception):
    """Raised when an order asks for more units than the pool can supply."""

    def __init__(self, product, requested, available):
        self.product = product
        self.requested = requested
        self.available = available
        super().__init__(
            f"{product.name}: asked for {requested}, only {available} available"
        )


class OrderStatus(models.TextChoices):
    AWAITING_PAYMENT = "awaiting_payment", "Awaiting payment"
    PAID = "paid", "Paid"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"
    REFUNDED = "refunded", "Refunded"


class OrderSource(models.TextChoices):
    WEB = "web", "Website checkout"
    WHATSAPP = "whatsapp", "WhatsApp"


class PaymentMethod(TimeStampedModel):
    """
    A way to pay, with the instructions the buyer sees after ordering.

    Kept in the database rather than settings so bank details and wallet
    numbers can change without a redeploy.
    """

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    instructions = models.TextField(
        help_text="Shown to the buyer after they order. Account numbers, wallet IDs, "
        "and what reference to quote."
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


def generate_order_number():
    body = "".join(secrets.choice(ORDER_NUMBER_ALPHABET) for _ in range(6))
    return f"{ORDER_NUMBER_PREFIX}-{body}"


class Order(TimeStampedModel):
    number = models.CharField(max_length=20, unique=True, editable=False)
    access_token = models.UUIDField(default=uuid.uuid4, editable=False)

    status = models.CharField(
        max_length=24,
        choices=OrderStatus.choices,
        default=OrderStatus.AWAITING_PAYMENT,
        db_index=True,
    )
    source = models.CharField(
        max_length=16, choices=OrderSource.choices, default=OrderSource.WEB
    )

    customer_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)

    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        related_name="orders",
        blank=True,
        null=True,
    )

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    currency = models.CharField(max_length=8, default="PKR")

    hold_expires_at = models.DateTimeField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)

    customer_note = models.TextField(blank=True)
    staff_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self):
        return f"{self.number} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._unique_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _unique_number():
        for _ in range(20):
            candidate = generate_order_number()
            if not Order.objects.filter(number=candidate).exists():
                return candidate
        raise RuntimeError("Could not allocate a unique order number")

    # --- state -------------------------------------------------------------

    @property
    def is_paid(self):
        return self.status in {OrderStatus.PAID, OrderStatus.DELIVERED}

    @property
    def credentials_released(self):
        return self.status == OrderStatus.DELIVERED

    @property
    def stock_items(self):
        return StockItem.objects.filter(order_item__order=self)

    def mark_paid(self):
        self.status = OrderStatus.PAID
        self.paid_at = timezone.now()
        self.hold_expires_at = None
        self.save(update_fields=["status", "paid_at", "hold_expires_at", "updated_at"])

    @transaction.atomic
    def mark_delivered(self):
        """Consume the reserved units and hand the credentials over."""
        now = timezone.now()
        self.stock_items.exclude(status=StockStatus.SOLD).update(
            status=StockStatus.SOLD, sold_at=now, reserved_until=None, updated_at=now
        )
        if not self.paid_at:
            self.paid_at = now
        self.status = OrderStatus.DELIVERED
        self.delivered_at = now
        self.hold_expires_at = None
        self.save(
            update_fields=[
                "status",
                "paid_at",
                "delivered_at",
                "hold_expires_at",
                "updated_at",
            ]
        )

    @transaction.atomic
    def cancel(self, reason=""):
        """
        Return the reserved units to the pool.

        Units already SOLD are left alone — once a buyer has the credentials
        the account is spent, whatever the order says afterwards.
        """
        now = timezone.now()
        self.stock_items.exclude(status=StockStatus.SOLD).update(
            status=StockStatus.AVAILABLE,
            reserved_until=None,
            order_item=None,
            updated_at=now,
        )
        self.status = OrderStatus.CANCELLED
        self.cancelled_at = now
        self.hold_expires_at = None
        if reason:
            self.staff_note = f"{self.staff_note}\n{reason}".strip()
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "hold_expires_at",
                "staff_note",
                "updated_at",
            ]
        )

    # --- creation ----------------------------------------------------------

    @classmethod
    @transaction.atomic
    def create_from_items(cls, items, *, source=OrderSource.WEB, **fields):
        """
        Build an order from [(product, quantity), ...], reserving stock as we go.

        Raises OutOfStock if any line cannot be filled. Because this runs in a
        transaction, a partial failure rolls back every reservation — an order
        is either fully stocked or it does not exist.
        """
        hold_minutes = settings.ORDER_HOLD_MINUTES
        order = cls(
            source=source,
            currency=settings.STORE_CURRENCY,
            hold_expires_at=timezone.now() + timezone.timedelta(minutes=hold_minutes),
            **fields,
        )
        order.save()

        subtotal = Decimal("0")
        for product, quantity in items:
            reserved = StockItem.allocate(
                product, quantity=quantity, hold_minutes=hold_minutes
            )
            if len(reserved) < quantity:
                raise OutOfStock(product, quantity, len(reserved))

            line = OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                product_slug=product.slug,
                unit_price=product.price,
                quantity=quantity,
            )
            StockItem.objects.filter(pk__in=[s.pk for s in reserved]).update(
                order_item=line, updated_at=timezone.now()
            )
            subtotal += line.line_total

        order.subtotal = subtotal
        order.total = subtotal
        order.save(update_fields=["subtotal", "total", "updated_at"])
        return order


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, related_name="order_items", null=True
    )

    # Snapshots — a product can be renamed or repriced after the sale.
    product_name = models.CharField(max_length=200)
    product_slug = models.SlugField(max_length=220, blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity


def expire_stale_orders():
    """
    Cancel unpaid orders whose hold has run out, freeing their stock.

    Without this an abandoned checkout would sit on inventory forever.
    """
    stale = Order.objects.filter(
        status=OrderStatus.AWAITING_PAYMENT,
        hold_expires_at__lt=timezone.now(),
    )
    count = 0
    for order in stale:
        order.cancel(reason="Auto-cancelled: payment hold expired.")
        count += 1
    return count
