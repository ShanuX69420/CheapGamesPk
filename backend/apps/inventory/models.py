from django.db import models, transaction
from django.db.models import Count, Q
from django.utils import timezone

from apps.catalog.models import Product, TimeStampedModel


class StockStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    RESERVED = "reserved", "Reserved"
    SOLD = "sold", "Sold"
    BURNED = "burned", "Burned"          # account reclaimed / key revoked
    DISABLED = "disabled", "Disabled"    # pulled from sale manually


class StockItemQuerySet(models.QuerySet):
    def available(self):
        return self.filter(status=StockStatus.AVAILABLE)

    def expired_reservations(self):
        return self.filter(
            status=StockStatus.RESERVED,
            reserved_until__lt=timezone.now(),
        )


class StockItem(TimeStampedModel):
    """
    One sellable unit: a set of account credentials or a single key.

    Stock is a finite pool, not a counter — handing the same account to two
    buyers is the failure mode that kills this kind of store, so allocation
    goes through `allocate()`, which locks rows before claiming them.
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

    status = models.CharField(
        max_length=16,
        choices=StockStatus.choices,
        default=StockStatus.AVAILABLE,
        db_index=True,
    )
    reserved_until = models.DateTimeField(blank=True, null=True)
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

    @classmethod
    @transaction.atomic
    def allocate(cls, product, quantity=1, hold_minutes=15):
        """
        Claim `quantity` units for `product` and return them as RESERVED.

        Returns fewer items than requested if stock ran out — callers must
        check the length before taking payment.
        """
        rows = cls.objects.select_for_update(
            **cls._lock_kwargs()
        ).filter(product=product, status=StockStatus.AVAILABLE)[:quantity]

        items = list(rows)
        if items:
            cls.objects.filter(pk__in=[i.pk for i in items]).update(
                status=StockStatus.RESERVED,
                reserved_until=timezone.now() + timezone.timedelta(minutes=hold_minutes),
                updated_at=timezone.now(),
            )
        return items

    @staticmethod
    def _lock_kwargs():
        """`skip_locked` where the database supports it (Postgres), plain lock on SQLite."""
        from django.db import connection

        if connection.features.has_select_for_update_skip_locked:
            return {"skip_locked": True}
        return {}

    def mark_sold(self):
        self.status = StockStatus.SOLD
        self.sold_at = timezone.now()
        self.reserved_until = None
        self.save(update_fields=["status", "sold_at", "reserved_until", "updated_at"])

    def release(self):
        """Return an unsold reservation to the pool."""
        self.status = StockStatus.AVAILABLE
        self.reserved_until = None
        self.save(update_fields=["status", "reserved_until", "updated_at"])

    def burn(self, reason=""):
        """Account reclaimed or key dead — never hand it out again."""
        self.status = StockStatus.BURNED
        if reason:
            self.notes = f"{self.notes}\n{reason}".strip()
        self.save(update_fields=["status", "notes", "updated_at"])


def release_expired_reservations():
    """Sweep abandoned carts back into available stock. Call from a cron/task."""
    return StockItem.objects.expired_reservations().update(
        status=StockStatus.AVAILABLE,
        reserved_until=None,
        updated_at=timezone.now(),
    )


def stock_summary():
    """Per-product counts, for the admin dashboard and low-stock alerts."""
    return Product.objects.annotate(
        available=Count("stock_items", filter=Q(stock_items__status=StockStatus.AVAILABLE)),
        sold=Count("stock_items", filter=Q(stock_items__status=StockStatus.SOLD)),
    )
