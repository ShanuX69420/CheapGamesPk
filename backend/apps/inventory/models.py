from django.db import models
from django.db.models import Count, Q
from django.utils import timezone

from apps.catalog.models import Product, TimeStampedModel


class StockStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    SOLD = "sold", "Sold"
    BURNED = "burned", "Burned"          # account reclaimed / key revoked
    DISABLED = "disabled", "Disabled"    # pulled from sale manually


class StockItemQuerySet(models.QuerySet):
    def available(self):
        return self.filter(status=StockStatus.AVAILABLE)


class StockItem(TimeStampedModel):
    """
    A set of credentials or a key, kept so staff can find it at fulfilment time.

    This is a library, not a pool. Nothing here limits what can be sold — an
    offline activation goes out as many times as we like — and orders never
    draw it down on their own. Staff attach a unit to an order line by hand
    when they want the buyer to collect it from the site.
    """

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="stock_items"
    )
    label = models.CharField(
        max_length=100,
        blank=True,
        help_text="Internal reference, e.g. 'batch-12 / acct-04'. Never shown to buyers.",
    )
    payload = models.TextField(
        help_text="What the buyer receives: login:password, key, or instructions. "
        "Treated as a secret — masked in list views."
    )

    order_item = models.ForeignKey(
        "orders.OrderItem",
        on_delete=models.SET_NULL,
        related_name="stock_items",
        blank=True,
        null=True,
        help_text="The order line this unit was assigned to.",
    )

    status = models.CharField(
        max_length=16,
        choices=StockStatus.choices,
        default=StockStatus.AVAILABLE,
        db_index=True,
    )
    sold_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True)

    objects = StockItemQuerySet.as_manager()

    class Meta:
        ordering = ["product", "id"]
        indexes = [
            models.Index(fields=["product", "status"]),
        ]

    def __str__(self):
        return f"{self.product.name} — {self.label or self.pk} ({self.get_status_display()})"

    @property
    def masked_payload(self):
        """Short preview for admin lists so credentials aren't splashed on screen."""
        first = self.payload.strip().splitlines()[0] if self.payload.strip() else ""
        return f"{first[:4]}…{first[-2:]}" if len(first) > 8 else "••••"

    def mark_sold(self):
        self.status = StockStatus.SOLD
        self.sold_at = timezone.now()
        self.save(update_fields=["status", "sold_at", "updated_at"])

    def release(self):
        """Put a unit back in circulation."""
        self.status = StockStatus.AVAILABLE
        self.save(update_fields=["status", "updated_at"])

    def burn(self, reason=""):
        """Account reclaimed or key dead — never hand it out again."""
        self.status = StockStatus.BURNED
        if reason:
            self.notes = f"{self.notes}\n{reason}".strip()
        self.save(update_fields=["status", "notes", "updated_at"])


def stock_summary():
    """Per-product counts, for the admin dashboard."""
    return Product.objects.annotate(
        available=Count("stock_items", filter=Q(stock_items__status=StockStatus.AVAILABLE)),
        sold=Count("stock_items", filter=Q(stock_items__status=StockStatus.SOLD)),
    )
