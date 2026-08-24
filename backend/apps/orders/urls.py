from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("payment-methods", views.PaymentMethodViewSet, basename="payment-method")

urlpatterns = [
    path("", include(router.urls)),
    path("config/", views.StoreConfigView.as_view(), name="store-config"),
    path("orders/", views.OrderCreateView.as_view(), name="order-create"),
    path("orders/recover/", views.OrderRecoverView.as_view(), name="order-recover"),
    path("orders/<str:number>/", views.OrderDetailView.as_view(), name="order-detail"),
]
