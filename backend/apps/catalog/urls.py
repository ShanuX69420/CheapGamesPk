from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="product")
router.register("categories", views.CategoryViewSet, basename="category")
router.register("platforms", views.PlatformViewSet, basename="platform")

urlpatterns = [
    path("", include(router.urls)),
]
