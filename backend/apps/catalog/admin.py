from django.contrib import admin
from django.db.models import Count, Q
from django.urls import reverse
from django.utils.html import format_html

from apps.inventory.models import StockStatus

from .models import Category, Platform, Product, ProductImage


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ["image", "alt_text", "sort_order"]


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "sort_order", "product_count"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["sort_order", "name"]

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(n=Count("products"))

    @admin.display(description="Products", ordering="n")
    def product_count(self, obj):
        return obj.n


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["__str__", "slug", "sort_order", "is_active", "product_count"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(n=Count("products"))

    @admin.display(description="Products", ordering="n")
    def product_count(self, obj):
        return obj.n


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "product_type",
        "platform",
        "price_display",
        "stock_display",
        "is_active",
        "is_featured",
    ]
    list_filter = ["product_type", "platform", "is_active", "is_featured", "categories"]
    list_editable = ["is_active", "is_featured"]
    search_fields = ["name", "short_description"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ["categories"]
    inlines = [ProductImageInline]
    save_on_top = True

    fieldsets = [
        (None, {"fields": ["name", "slug", "product_type", "platform", "categories"]}),
        ("Pricing", {"fields": ["price", "compare_at_price"]}),
        ("Availability", {"fields": ["region", "release_date", "is_active", "is_featured"]}),
        (
            "Content",
            {
                "fields": [
                    "short_description",
                    "description",
                    "limitations",
                    "system_requirements",
                ]
            },
        ),
        (
            "Post-purchase",
            {
                "fields": ["activation_instructions"],
                "description": "Sent to the buyer after payment. Not exposed by the public API.",
            },
        ),
        ("SEO", {"fields": ["meta_title", "meta_description"], "classes": ["collapse"]}),
    ]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("platform")
            .annotate(
                available=Count(
                    "stock_items",
                    filter=Q(stock_items__status=StockStatus.AVAILABLE),
                    distinct=True,
                )
            )
        )

    @admin.display(description="Price", ordering="price")
    def price_display(self, obj):
        if obj.is_on_sale:
            return format_html(
                '<s style="color:#999">{}</s> <b>{}</b> '
                '<span style="color:#c0392b">-{}%</span>',
                obj.compare_at_price,
                obj.price,
                obj.discount_percent,
            )
        return obj.price

    @admin.display(description="In stock", ordering="available")
    def stock_display(self, obj):
        url = reverse("admin:inventory_stockitem_changelist")
        colour = "#27ae60" if obj.available > 3 else "#e67e22" if obj.available else "#c0392b"
        return format_html(
            '<a href="{}?product__id__exact={}" style="color:{};font-weight:600">{}</a>',
            url,
            obj.pk,
            colour,
            obj.available,
        )
