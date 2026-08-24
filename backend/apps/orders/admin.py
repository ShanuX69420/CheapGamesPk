from django.conf import settings
from django.contrib import admin, messages
from django.urls import reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from . import ga, meta
from .models import Order, OrderItem, OrderStatus, PaymentMethod

# The two places a completed order is reported as a sale. Both modules answer
# to the same five names — NAME, PURCHASE_STAMP, is_configured, can_report and
# send_purchase — so this page can tell each one in turn without knowing which
# is which, and adding a third would be a one-line change here.
CONVERSIONS = (meta, ga)

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
        "action_send_purchase",
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
        "meta_purchase_event_sent_at",
        "ga_purchase_event_sent_at",
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
        (
            "Internal",
            {
                "fields": [
                    "staff_note",
                    "access_token",
                    "meta_purchase_event_sent_at",
                    "ga_purchase_event_sent_at",
                ]
            },
        ),
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
        """
        The URL the buyer uses to track this order and collect credentials.

        Absolute, because the point of it is to be pasted into the WhatsApp
        chat — a relative path would be useless there. Built from SITE_URL, so
        a stale value hands out dead links.
        """
        if not obj.pk:
            return "—"
        url = f"{settings.SITE_URL}/order/{obj.number}?token={obj.access_token}"
        return format_html('<a href="{}" target="_blank"><code>{}</code></a>', url, url)

    # --- actions -----------------------------------------------------------

    def get_actions(self, request):
        """
        Keep the re-send action out of the way of a store with no tracking.

        Nothing here breaks without it, but an action that can only ever answer
        "nothing is configured" is furniture.
        """
        actions = super().get_actions(request)
        if not any(api.is_configured() for api in CONVERSIONS):
            actions.pop("action_send_purchase", None)
        return actions

    def save_model(self, request, obj, form, change):
        """
        Switching the status to Delivered by hand counts as completing the order.

        The dropdown on this page is the other way staff finish a sale, and on
        its own it only writes a word to a column — no timestamps, and neither
        Meta nor Google ever hears about the money. Send it down the same path
        the action takes so both ways of finishing an order mean the same
        thing.
        """
        super().save_model(request, obj, form, change)

        if obj.status == OrderStatus.DELIVERED and "status" in form.changed_data:
            obj.mark_delivered()
            self._report_purchase(request, [obj])

    def _report_purchase(self, request, orders):
        """
        Tell every network that is configured that these orders were sales.

        Each is asked separately and can fail separately, which is why each
        stamps its own column — a retry then only re-sends the half that never
        landed.
        """
        for api in CONVERSIONS:
            if not api.is_configured():
                continue
            # A buyer the network never saw is not a failure, so leave them out
            # of the count rather than reporting one.
            reportable = [order for order in orders if api.can_report(order)]
            if not reportable:
                continue
            sent = sum(bool(api.send_purchase(order)) for order in reportable)
            self._say_what_landed(request, api, sent, len(reportable))

    def _say_what_landed(self, request, api, sent, expected):
        """
        Say what actually arrived — silence would be worse than noise here.

        A purchase that never lands is invisible in the admin and only shows up
        later as ad spend against sales the network thinks never happened.
        """
        if sent == expected:
            self.message_user(
                request,
                f"{sent} purchase event(s) sent to {api.NAME}.",
                messages.SUCCESS,
            )
        else:
            self.message_user(
                request,
                f"{sent} of {expected} purchase event(s) reached {api.NAME}. The "
                "rest were reported before, or failed — the reason is in the "
                'server log, and "Send the purchase event again" retries them.',
                messages.WARNING,
            )

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

        Delivery itself happens in the WhatsApp chat — that is where you send
        the account details. This only records that it happened, reveals any
        credentials you attached to the order by hand, and tells Meta and Google
        the sale went through. This is the moment a purchase is counted: nothing
        before it is money, because until now the buyer had only asked.
        """
        delivered, skipped = [], 0
        for order in queryset:
            if order.status == OrderStatus.CANCELLED:
                skipped += 1
                continue
            order.mark_delivered()
            delivered.append(order)

        note = f"{len(delivered)} order(s) marked completed."
        if skipped:
            note += f" {skipped} skipped (cancelled)."
        self.message_user(request, note, messages.SUCCESS)
        self._report_purchase(request, delivered)

    @admin.action(description="Send the purchase event again")
    def action_send_purchase(self, request, queryset):
        """
        Report a sale a network never heard about.

        Completing an order already reports itself, so this is for the day the
        token had expired or the endpoint was down — the failure is in the log
        and the order is still unreported. Each network is chased separately on
        its own stamp, so one that already has the sale is left alone, and an
        order that was never completed has no sale to report yet.
        """
        anything = False

        for api in CONVERSIONS:
            if not api.is_configured():
                continue
            pending = [
                order
                for order in queryset.filter(
                    status=OrderStatus.DELIVERED,
                    **{f"{api.PURCHASE_STAMP}__isnull": True},
                )
                if api.can_report(order)
            ]
            if not pending:
                continue
            anything = True
            sent = sum(bool(api.send_purchase(order)) for order in pending)
            self._say_what_landed(request, api, sent, len(pending))

        if not anything:
            self.message_user(
                request,
                "Nothing to send — those orders are either unfinished, already "
                "reported, or were placed by a browser the tracking never saw.",
                messages.WARNING,
            )

    @admin.action(description="Cancel this order")
    def action_cancel(self, request, queryset):
        done = 0
        for order in queryset.exclude(status=OrderStatus.CANCELLED):
            order.cancel(reason=f"Cancelled in admin by {request.user}.")
            done += 1
        self.message_user(
            request, f"{done} order(s) cancelled.", messages.WARNING
        )
