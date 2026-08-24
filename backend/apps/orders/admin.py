from django.contrib import admin, messages
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .emails import send_order_confirmation, send_order_delivered
from .models import Order, OrderItem, OrderStatus, PaymentMethod

STATUS_COLOURS = {
    OrderStatus.AWAITING_PAYMENT: "#e67e22",
    OrderStatus.PAID: "#2980b9",
    OrderStatus.DELIVERED: "#27ae60",
    OrderStatus.CANCELLED: "#7f8c8d",
    OrderStatus.REFUNDED: "#c0392b",
}


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_active", "sort_order"]
    list_editable = ["is_active", "sort_order"]
    prepopulated_fields = {"slug": ("name",)}


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    fields = ["product_name", "unit_price", "quantity", "line_total", "assigned_units"]
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description="Line total")
    def line_total(self, obj):
        return obj.line_total

    @admin.display(description="Assigned units")
    def assigned_units(self, obj):
        """The actual credentials, so staff can fulfil without digging."""
        units = obj.stock_items.all()
        if not units:
            return "—"

        rows = []
        for unit in units:
            url = reverse("admin:inventory_stockitem_change", args=[unit.pk])
            rows.append(
                format_html(
                    '<div style="margin-bottom:4px">'
                    '<a href="{}">#{}</a> '
                    '<span style="color:#888">[{}]</span><br>'
                    '<code style="font-size:11px">{}</code></div>',
                    url,
                    unit.pk,
                    unit.get_status_display(),
                    unit.payload,
                )
            )
        return mark_safe("".join(rows))


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "number",
        "status_badge",
        "source",
        "customer",
        "total_display",
        "payment_method",
        "created_at",
    ]
    list_filter = ["status", "source", "payment_method", "created_at"]
    search_fields = ["number", "email", "phone", "customer_name", "items__product_name"]
    date_hierarchy = "created_at"
    inlines = [OrderItemInline]
    actions = [
        "action_mark_paid",
        "action_deliver",
        "action_cancel",
        "action_resend_email",
    ]
    list_select_related = ["payment_method"]

    readonly_fields = [
        "number",
        "access_token",
        "subtotal",
        "total",
        "currency",
        "customer_link",
        "paid_at",
        "delivered_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (None, {"fields": ["number", "status", "source", "payment_method"]}),
        (
            "Customer",
            {"fields": ["customer_name", "email", "phone", "customer_link", "customer_note"]},
        ),
        ("Money", {"fields": ["subtotal", "total", "currency"]}),
        (
            "Timeline",
            {
                "fields": [
                    "paid_at",
                    "delivered_at",
                    "cancelled_at",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
        ("Internal", {"fields": ["staff_note", "access_token"]}),
    ]

    # --- display -----------------------------------------------------------

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        return format_html(
            '<span style="color:{};font-weight:600">{}</span>',
            STATUS_COLOURS.get(obj.status, "#000"),
            obj.get_status_display(),
        )

    @admin.display(description="Customer")
    def customer(self, obj):
        return obj.customer_name or obj.email or obj.phone or "—"

    @admin.display(description="Total", ordering="total")
    def total_display(self, obj):
        return f"{obj.currency} {obj.total:,.0f}"

    @admin.display(description="Order status link")
    def customer_link(self, obj):
        """The URL the buyer uses to track this order and collect credentials."""
        if not obj.pk:
            return "—"
        url = f"/order/{obj.number}?token={obj.access_token}"
        return format_html('<code>{}</code>', url)

    # --- actions -----------------------------------------------------------

    @admin.action(description="Mark as paid (not yet completed)")
    def action_mark_paid(self, request, queryset):
        done = 0
        for order in queryset.exclude(status__in=[OrderStatus.DELIVERED, OrderStatus.CANCELLED]):
            order.mark_paid()
            done += 1
        self.message_user(request, f"{done} order(s) marked paid.")

    @admin.action(description="Mark completed — order fulfilled")
    def action_deliver(self, request, queryset):
        """
        Close an order out once you have actually delivered it.

        Delivery itself happens wherever you talk to the buyer — usually the
        WhatsApp chat. This marks the order done, reveals any credentials you
        attached to it by hand, and emails the buyer if we have an address.
        """
        done, skipped = 0, 0
        for order in queryset:
            if order.status == OrderStatus.CANCELLED:
                skipped += 1
                continue
            order.mark_delivered()
            done += 1

        note = f"{done} order(s) marked completed."
        if skipped:
            note += f" {skipped} skipped (cancelled)."
        self.message_user(request, note, messages.SUCCESS)

    @admin.action(description="Cancel this order")
    def action_cancel(self, request, queryset):
        done = 0
        for order in queryset.exclude(status=OrderStatus.CANCELLED):
            order.cancel(reason=f"Cancelled in admin by {request.user}.")
            done += 1
        self.message_user(
            request, f"{done} order(s) cancelled.", messages.WARNING
        )

    @admin.action(description="Resend the order email to the buyer")
    def action_resend_email(self, request, queryset):
        sent, skipped = 0, 0
        for order in queryset:
            if not order.email:
                skipped += 1
                continue
            # Match the message to where the order actually is.
            if order.status == OrderStatus.DELIVERED:
                send_order_delivered(order)
            else:
                send_order_confirmation(order)
            sent += 1

        note = f"Re-sent {sent} email(s)."
        if skipped:
            note += f" {skipped} order(s) have no email address (WhatsApp orders)."
        self.message_user(request, note)

