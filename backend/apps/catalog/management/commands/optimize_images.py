"""
Re-encode artwork that was uploaded before the model started compressing,
and write the card-sized copy for rows that predate it.

Everything uploaded from now on gets both renditions on its way in, so this
is a catch-up for what is already sitting in media/. Safe to re-run: a cover
that is already WebP and within the width cap, and already has a card next to
it, is left alone.
"""

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from apps.catalog.imaging import (
    CARD_MAX_WIDTH,
    needs_work,
    render_webp,
    webp_name,
)
from apps.catalog.models import ProductImage


def kb(size):
    return f"{size / 1024:.0f} KB"


class Command(BaseCommand):
    help = "Resize and convert already-uploaded product images to WebP."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        before_total = after_total = 0
        converted = skipped = 0

        for record in ProductImage.objects.select_related("product"):
            field = record.image
            old_name = field.name
            label = f"{record.product.name}: {old_name}"

            if not field.storage.exists(old_name):
                self.stderr.write(self.style.WARNING(f"missing  {label}"))
                continue

            wants_card = not record.thumbnail

            try:
                with field.storage.open(old_name, "rb") as fp:
                    stale = needs_work(fp)
                    if not stale and not wants_card:
                        skipped += 1
                        continue
                    # Both renditions come off the file on disk, so the card is
                    # not a re-encode of a cover this run just re-encoded.
                    fp.seek(0)
                    data = render_webp(fp) if stale else None
                    if wants_card:
                        fp.seek(0)
                        card = render_webp(fp, CARD_MAX_WIDTH)
            except Exception as exc:  # a corrupt file should not stop the run
                self.stderr.write(self.style.ERROR(f"failed   {label}: {exc}"))
                continue

            before = field.size
            before_total += before
            after_total += len(data) if stale else before
            if wants_card:
                after_total += len(card)
            converted += 1

            did = "would fix" if dry_run else "fixed"
            sizes = f"{kb(before)} -> {kb(len(data))}" if stale else "cover ok"
            if wants_card:
                sizes += f", card {kb(len(card))}"
            self.stdout.write(f"{did}  {label}  {sizes}")

            if dry_run:
                continue

            if stale:
                field.save(webp_name(old_name), ContentFile(data), save=True)
                if field.name != old_name:
                    field.storage.delete(old_name)
            if wants_card:
                record.thumbnail.save(
                    webp_name(field.name), ContentFile(card), save=True
                )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"{converted} touched, {skipped} already optimized "
                f"({kb(before_total)} -> {kb(after_total)})"
            )
        )
