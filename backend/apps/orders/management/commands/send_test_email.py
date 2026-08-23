"""
Send a real order email to an address of your choosing.

Use this after pointing EMAIL_HOST at a live SMTP provider — it exercises the
same templates and the same sending path as a real order, so if this lands in
an inbox, checkout will too.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.orders.emails import send_order_confirmation, send_order_delivered
from apps.orders.models import Order


class Command(BaseCommand):
    help = "Send a confirmation or delivery email for an existing order."

    def add_arguments(self, parser):
        parser.add_argument("to", help="Where to send the test.")
        parser.add_argument(
            "--order",
            help="Order number to render. Defaults to the most recent order.",
        )
        parser.add_argument(
            "--kind",
            choices=["confirmation", "delivered"],
            default="confirmation",
        )

    def handle(self, *args, **options):
        order = (
            Order.objects.filter(number=options["order"].upper()).first()
            if options["order"]
            else Order.objects.order_by("-created_at").first()
        )
        if order is None:
            raise CommandError(
                "No order to render. Place one first, or pass --order."
            )

        backend = settings.EMAIL_BACKEND.rsplit(".", 2)[-2]
        self.stdout.write(f"Backend:   {backend}")
        self.stdout.write(f"From:      {settings.DEFAULT_FROM_EMAIL}")
        self.stdout.write(f"Order:     {order.number}")
        self.stdout.write(f"Sending {options['kind']} to {options['to']}…")

        # Redirect this one message without touching the stored order.
        original, order.email = order.email, options["to"]
        sender = (
            send_order_delivered
            if options["kind"] == "delivered"
            else send_order_confirmation
        )
        thread = sender(order)
        if thread:
            thread.join(timeout=settings.EMAIL_TIMEOUT + 5)
        order.email = original

        if "console" in settings.EMAIL_BACKEND:
            self.stdout.write(
                self.style.WARNING(
                    "\nEMAIL_HOST is unset, so that was printed above rather than sent. "
                    "Set EMAIL_HOST to test real delivery."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    "\nHanded to the SMTP server. If it does not arrive, check the "
                    "server log for a traceback — sending never raises into the app."
                )
            )
