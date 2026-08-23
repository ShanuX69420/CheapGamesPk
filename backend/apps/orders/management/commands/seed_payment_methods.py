"""Seed the payment methods a Pakistan-facing store typically starts with."""

from django.core.management.base import BaseCommand

from apps.orders.models import PaymentMethod

METHODS = [
    (
        "JazzCash",
        "jazzcash",
        "Send the total to JazzCash account 03XX-XXXXXXX (Account title: YOUR NAME).\n"
        "Quote your order number in the payment reference.\n"
        "Then send us the screenshot on WhatsApp so we can confirm within minutes.",
        1,
    ),
    (
        "EasyPaisa",
        "easypaisa",
        "Send the total to EasyPaisa account 03XX-XXXXXXX (Account title: YOUR NAME).\n"
        "Quote your order number in the payment reference.\n"
        "Then send us the screenshot on WhatsApp so we can confirm within minutes.",
        2,
    ),
    (
        "Bank transfer",
        "bank-transfer",
        "Bank: YOUR BANK\nAccount title: YOUR NAME\nAccount number / IBAN: PKXX XXXX ...\n\n"
        "Quote your order number in the transfer reference. Bank transfers can take "
        "a few hours to show up.",
        3,
    ),
    (
        "Cryptocurrency",
        "crypto",
        "We accept USDT (TRC-20). Ask on WhatsApp for the current wallet address — "
        "we rotate it, so please do not reuse an address from an earlier order.",
        4,
    ),
]


class Command(BaseCommand):
    help = "Create starter payment methods. Edit the details in the admin afterwards."

    def handle(self, *args, **options):
        for name, slug, instructions, order in METHODS:
            obj, created = PaymentMethod.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "instructions": instructions, "sort_order": order},
            )
            self.stdout.write(f"  {'created' if created else 'exists '}: {obj.name}")

        self.stdout.write(
            self.style.WARNING(
                "\nThese contain placeholder account numbers. "
                "Edit them in the admin before taking real orders."
            )
        )
