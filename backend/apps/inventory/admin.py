from django import forms
from django.contrib import admin, messages
from django.shortcuts import redirect, render
from django.urls import path, reverse
from django.utils.html import format_html

from apps.catalog.models import Product

from .models import StockItem, StockStatus, release_expired_reservations


class BulkImportForm(forms.Form):
    """Paste a batch of credentials, one unit per line."""

    product = forms.ModelChoiceField(
        queryset=Product.objects.filter(is_active=True).order_by("name"),
        help_text="Which listing these units belong to.",
    )
    payloads = forms.CharField(
        widget=forms.Textarea(attrs={"rows": 16, "style": "width:100%;font-family:monospace"}),
        label="Credentials",
        help_text=(
            "One unit per line — e.g. <code>login:password</code> or a key. "
            "Blank lines are ignored. Use <code>|</code> to add an internal label: "
            "<code>batch-12/acct-04 | login:password</code>"
        ),
    )
    label_prefix = forms.CharField(
        required=False,
        help_text="Optional. Applied to lines with no explicit label, numbered automatically.",
    )
    skip_duplicates = forms.BooleanField(
        required=False,
        initial=True,
        help_text="Skip lines already in stock for this product.",
    )


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "product",
        "label",
        "status_badge",
        "payload_preview",
        "reserved_until",
        "sold_at",
    ]
    list_filter = ["status", "product__product_type", "product__platform", "product"]
    search_fields = ["label", "notes", "product__name"]
    autocomplete_fields = ["product"]
    readonly_fields = ["sold_at", "created_at", "updated_at"]
    actions = ["action_release", "action_burn", "action_disable"]
    list_select_related = ["product"]

    fieldsets = [
        (None, {"fields": ["product", "label", "payload"]}),
        ("State", {"fields": ["status", "reserved_until", "sold_at"]}),
        ("Notes", {"fields": ["notes"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"], "classes": ["collapse"]}),
    ]

    # --- list display helpers -------------------------------------------------

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colours = {
            StockStatus.AVAILABLE: "#27ae60",
            StockStatus.RESERVED: "#e67e22",
            StockStatus.SOLD: "#2980b9",
            StockStatus.BURNED: "#c0392b",
            StockStatus.DISABLED: "#7f8c8d",
        }
        return format_html(
            '<span style="color:{};font-weight:600">{}</span>',
            colours.get(obj.status, "#000"),
            obj.get_status_display(),
        )

    @admin.display(description="Payload")
    def payload_preview(self, obj):
        return obj.masked_payload

    # --- bulk actions ---------------------------------------------------------

    @admin.action(description="Release back to available")
    def action_release(self, request, queryset):
        count = queryset.exclude(status=StockStatus.SOLD).update(
            status=StockStatus.AVAILABLE, reserved_until=None
        )
        self.message_user(request, f"{count} unit(s) released back into stock.")

    @admin.action(description="Burn (reclaimed / dead)")
    def action_burn(self, request, queryset):
        count = queryset.update(status=StockStatus.BURNED)
        self.message_user(request, f"{count} unit(s) burned.", messages.WARNING)

    @admin.action(description="Disable (pull from sale)")
    def action_disable(self, request, queryset):
        count = queryset.update(status=StockStatus.DISABLED)
        self.message_user(request, f"{count} unit(s) disabled.")

    # --- custom views ---------------------------------------------------------

    def get_urls(self):
        custom = [
            path(
                "bulk-import/",
                self.admin_site.admin_view(self.bulk_import_view),
                name="inventory_stockitem_bulk_import",
            ),
            path(
                "release-expired/",
                self.admin_site.admin_view(self.release_expired_view),
                name="inventory_stockitem_release_expired",
            ),
        ]
        return custom + super().get_urls()

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["bulk_import_url"] = reverse(
            "admin:inventory_stockitem_bulk_import"
        )
        return super().changelist_view(request, extra_context)

    def release_expired_view(self, request):
        count = release_expired_reservations()
        self.message_user(request, f"{count} expired reservation(s) returned to stock.")
        return redirect("admin:inventory_stockitem_changelist")

    def bulk_import_view(self, request):
        form = BulkImportForm(request.POST or None)

        if request.method == "POST" and form.is_valid():
            product = form.cleaned_data["product"]
            prefix = form.cleaned_data["label_prefix"].strip()
            skip_dupes = form.cleaned_data["skip_duplicates"]

            existing = set()
            if skip_dupes:
                existing = set(
                    StockItem.objects.filter(product=product).values_list(
                        "payload", flat=True
                    )
                )

            created, skipped = [], 0
            for index, raw in enumerate(form.cleaned_data["payloads"].splitlines(), 1):
                line = raw.strip()
                if not line:
                    continue

                label, _, rest = line.partition("|")
                if rest.strip():
                    label, payload = label.strip(), rest.strip()
                else:
                    payload = line
                    label = f"{prefix}-{index}" if prefix else ""

                if payload in existing:
                    skipped += 1
                    continue

                existing.add(payload)
                created.append(
                    StockItem(product=product, label=label[:100], payload=payload)
                )

            StockItem.objects.bulk_create(created)

            note = f"Added {len(created)} unit(s) to {product.name}."
            if skipped:
                note += f" Skipped {skipped} duplicate(s)."
            self.message_user(request, note, messages.SUCCESS)
            return redirect(
                f"{reverse('admin:inventory_stockitem_changelist')}"
                f"?product__id__exact={product.pk}"
            )

        context = {
            **self.admin_site.each_context(request),
            "title": "Bulk import stock",
            "form": form,
            "opts": self.model._meta,
        }
        return render(request, "admin/inventory/bulk_import.html", context)
