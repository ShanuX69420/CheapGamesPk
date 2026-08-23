from rest_framework import serializers

from .models import Category, Platform, Product, ProductImage


class PlatformSerializer(serializers.ModelSerializer):
    class Meta:
        model = Platform
        fields = ["id", "name", "slug", "icon"]


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "description", "product_count"]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order"]


class ProductListSerializer(serializers.ModelSerializer):
    """Card view — keep it small, the grid loads 24 at a time."""

    platform = PlatformSerializer(read_only=True)
    product_type_display = serializers.CharField(
        source="get_product_type_display", read_only=True
    )
    image = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    is_on_sale = serializers.BooleanField(read_only=True)
    in_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "product_type",
            "product_type_display",
            "platform",
            "region",
            "price",
            "compare_at_price",
            "discount_percent",
            "is_on_sale",
            "in_stock",
            "is_featured",
            "image",
        ]

    @staticmethod
    def _available(obj):
        """Use the viewset's annotation when present; fall back to a query."""
        annotated = getattr(obj, "available_count", None)
        return annotated if annotated is not None else obj.stock_count

    def get_in_stock(self, obj):
        return self._available(obj) > 0

    def get_image(self, obj):
        image = obj.primary_image
        if not image:
            return None
        request = self.context.get("request")
        url = image.image.url
        return request.build_absolute_uri(url) if request else url


class ProductDetailSerializer(ProductListSerializer):
    """
    Everything the public product page needs.

    Deliberately omits `activation_instructions` — that is post-purchase
    content and must not be readable from the public catalog endpoint.
    """

    categories = CategorySerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    stock_count = serializers.SerializerMethodField()

    def get_stock_count(self, obj):
        return self._available(obj)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "categories",
            "images",
            "short_description",
            "description",
            "limitations",
            "system_requirements",
            "release_date",
            "stock_count",
            "meta_title",
            "meta_description",
            "created_at",
        ]
