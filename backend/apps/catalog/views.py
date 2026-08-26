import django_filters
from django.db.models import Count, F, Prefetch, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Category, Platform, Product, ProductImage
from .serializers import (
    CategorySerializer,
    PlatformSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class ProductFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="categories__slug")
    platform = django_filters.CharFilter(field_name="platform__slug")
    type = django_filters.CharFilter(field_name="product_type")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    on_sale = django_filters.BooleanFilter(method="filter_on_sale")

    class Meta:
        model = Product
        fields = ["category", "platform", "type", "is_featured"]

    def filter_on_sale(self, queryset, name, value):
        lookup = Q(compare_at_price__isnull=False, compare_at_price__gt=F("price"))
        return queryset.filter(lookup) if value else queryset.exclude(lookup)


class ReleaseDateOrderingFilter(OrderingFilter):
    """release_date is optional, and Postgres puts NULLs first under DESC, so a
    plain order_by would rank every undated product above the newest release."""

    def filter_queryset(self, request, queryset, view):
        terms = []
        for term in self.get_ordering(request, queryset, view) or []:
            if term.lstrip("-") == "release_date":
                expr = F("release_date")
                terms.append(
                    expr.desc(nulls_last=True)
                    if term.startswith("-")
                    else expr.asc(nulls_last=True)
                )
            else:
                terms.append(term)
        return queryset.order_by(*terms) if terms else queryset


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    filterset_class = ProductFilter
    filter_backends = [DjangoFilterBackend, SearchFilter, ReleaseDateOrderingFilter]
    search_fields = ["name", "short_description", "description"]
    ordering_fields = ["price", "created_at", "release_date", "name"]
    ordering = ["-release_date", "-created_at"]

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("platform")
            .prefetch_related(
                "categories",
                Prefetch("images", queryset=ProductImage.objects.order_by("sort_order", "id")),
            )
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        return ProductListSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True).annotate(
            product_count=Count("products", filter=Q(products__is_active=True), distinct=True)
        )


class PlatformViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    serializer_class = PlatformSerializer
    pagination_class = None
    queryset = Platform.objects.all()
