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
    # Root-relative, for the same reason as Product.cover().
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ["id", "image", "alt_text", "sort_order"]

    def get_image(self, obj):
        return obj.image.url


class ProductListSerializer(serializers.ModelSerializer):
    """Card view — keep it small, the grid loads 24 at a time."""

    platform = PlatformSerializer(read_only=True)
    product_type_display = serializers.CharField(
        source="get_product_type_display", read_only=True
    )
    image = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    is_on_sale = serializers.BooleanField(read_only=True)

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
            "is_featured",
            "image",
        ]

    def get_image(self, obj):
        return obj.cover()


class ProductDetailSerializer(ProductListSerializer):
    """
    Everything the public product page needs.

    Deliberately omits `activation_instructions` — that is post-purchase
    content and must not be readable from the public catalog endpoint.
    """

    categories = CategorySerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    banner = serializers.SerializerMethodField()

    def get_banner(self, obj):
        return obj.banner()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "categories",
            "images",
            "banner",
            "short_description",
            "description",
            "limitations",
            "system_requirements",
            "release_date",
            "meta_title",
            "meta_description",
            "created_at",
        ]
