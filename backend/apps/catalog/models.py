from decimal import Decimal

from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SluggedModel(TimeStampedModel):
    """Gives a model a name plus a slug derived from it on first save."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._unique_slug(slugify(self.name)[:200] or "item")
        super().save(*args, **kwargs)

    def _unique_slug(self, base):
        candidate, suffix = base, 2
        taken = type(self).objects.exclude(pk=self.pk)
        while taken.filter(slug=candidate).exists():
            candidate = f"{base}-{suffix}"
            suffix += 1
        return candidate


class Platform(SluggedModel):
    """Steam, EA App, Ubisoft Connect, Microsoft Store, Xbox, ..."""

    icon = models.ImageField(upload_to="platforms/", blank=True, null=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Category(SluggedModel):
    """Browse taxonomy — genres, or curated groupings like 'Weekly Deals'."""

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="children",
        blank=True,
        null=True,
    )
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return f"{self.parent.name} / {self.name}" if self.parent else self.name


class ProductType(models.TextChoices):
    OFFLINE_ACCOUNT = "offline_account", "Offline account"
    ONLINE_ACCOUNT = "online_account", "Online account"
    KEY = "key", "Game key"
    SUBSCRIPTION = "subscription", "Subscription"
    OTHER = "other", "Other"


class Product(SluggedModel):
    """A sellable listing. Stock lives in inventory.StockItem."""

    product_type = models.CharField(
        max_length=32,
        choices=ProductType.choices,
        default=ProductType.OFFLINE_ACCOUNT,
        db_index=True,
    )
    platform = models.ForeignKey(
        Platform,
        on_delete=models.PROTECT,
        related_name="products",
        blank=True,
        null=True,
    )
    categories = models.ManyToManyField(Category, related_name="products", blank=True)

    region = models.CharField(
        max_length=100,
        default="Global",
        help_text="e.g. Global, Region Free, EU only",
    )
    release_date = models.DateField(blank=True, null=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Original price, shown struck through. Leave blank if not on sale.",
    )

    short_description = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    activation_instructions = models.TextField(
        blank=True,
        help_text="Shown to the buyer after purchase.",
    )
    limitations = models.TextField(
        blank=True,
        help_text="What does NOT work — no online play, no cloud saves, etc.",
    )
    system_requirements = models.TextField(blank=True)

    cover_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="External portrait cover (3:4). Used when no image is uploaded below.",
    )
    banner_url = models.URLField(
        max_length=500,
        blank=True,
        help_text="External wide banner (16:9), shown at the top of the product page.",
    )

    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)

    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]
        indexes = [
            models.Index(fields=["is_active", "product_type"]),
        ]

    def __str__(self):
        return self.name

    @property
    def is_on_sale(self):
        return bool(self.compare_at_price and self.compare_at_price > self.price)

    @property
    def discount_percent(self):
        if not self.is_on_sale:
            return 0
        cut = (self.compare_at_price - self.price) / self.compare_at_price
        return int((cut * Decimal(100)).quantize(Decimal("1")))

    @property
    def primary_image(self):
        return self.images.first()

    def cover(self, request=None):
        """Uploaded image wins; otherwise fall back to the external cover URL."""
        uploaded = self.primary_image
        if uploaded:
            url = uploaded.image.url
            return request.build_absolute_uri(url) if request else url
        return self.cover_url or None

    def banner(self, request=None):
        return self.banner_url or self.cover(request)


class ProductImage(TimeStampedModel):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/")
    alt_text = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"Image for {self.product.name}"
