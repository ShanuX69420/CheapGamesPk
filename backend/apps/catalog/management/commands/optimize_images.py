"""
Re-encode artwork that was uploaded before the model started compressing.

Everything uploaded from now on is resized on its way in, so this is a
one-shot catch-up for the originals already sitting in media/. Safe to
re-run: files that are already WebP and within the width cap are skipped.
"""

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from apps.catalog.imaging import needs_work, render_webp, webp_name
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

            try:
                with field.storage.open(old_name, "rb") as fp:
                    if not needs_work(fp):
                        skipped += 1
                        continue
                    fp.seek(0)
                    data = render_webp(fp)
            except Exception as exc:  # a corrupt file should not stop the run
                self.stderr.write(self.style.ERROR(f"failed   {label}: {exc}"))
                continue

            before = field.size
            before_total += before
            after_total += len(data)
            converted += 1
            self.stdout.write(f"{'would fix' if dry_run else 'fixed'}  {label}"
                              f"  {kb(before)} -> {kb(len(data))}")

            if dry_run:
                continue

            field.save(webp_name(old_name), ContentFile(data), save=True)
            if field.name != old_name:
                field.storage.delete(old_name)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"{converted} converted, {skipped} already optimized "
                f"({kb(before_total)} -> {kb(after_total)})"
            )
        )
