"""
Fill in cover/banner artwork for products from Steam's public CDN.

Steam serves capsule art at predictable URLs keyed by appid, with no API key
required. We resolve appid by name, then verify each image actually exists
before saving it — a broken cover looks worse than a styled fallback tile.
"""

import json
import urllib.parse
import urllib.request

from django.core.management.base import BaseCommand

from apps.catalog.models import Product

SEARCH_URL = "https://steamcommunity.com/actions/SearchApps/{}"
ASSET_HOSTS = [
    "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{id}/{file}",
    "https://cdn.cloudflare.steamstatic.com/steam/apps/{id}/{file}",
]
PORTRAIT = ["library_600x900.jpg", "library_600x900_2x.jpg", "header.jpg"]
WIDE = ["library_hero.jpg", "page_bg_generated_v6b.jpg", "header.jpg"]

# Search is fuzzy ("Mortal Kombat 1" returns MK11 first), so pin the ones we seed.
KNOWN_APPIDS = {
    "Mortal Kombat 1 Premium Edition": 1971870,
    "EA Sports FC 26 Ultimate Edition": 3405690,
    "Assassin's Creed Shadows Gold Edition": 3159330,
    "Forza Horizon 6 Premium Edition": 1551360,
    "Resident Evil Requiem Deluxe": 2050650,
    "Football Manager 2026 + In-Game Editor": 1904540,
    "Cyberpunk 2077: Ultimate Edition": 1091500,
    "Baldur's Gate 3 Digital Deluxe": 1086940,
}

TIMEOUT = 15
UA = {"User-Agent": "Mozilla/5.0 (compatible; cheapgamespk/1.0)"}


def _request(url, method="GET"):
    return urllib.request.Request(url, headers=UA, method=method)


def resolve_appid(name):
    query = urllib.parse.quote(name)
    try:
        with urllib.request.urlopen(_request(SEARCH_URL.format(query)), timeout=TIMEOUT) as r:
            results = json.loads(r.read().decode())
    except Exception:
        return None
    return int(results[0]["appid"]) if results else None


def first_available(appid, filenames):
    """Return the first URL that actually resolves, or None."""
    for filename in filenames:
        for template in ASSET_HOSTS:
            url = template.format(id=appid, file=filename)
            try:
                with urllib.request.urlopen(_request(url, "HEAD"), timeout=TIMEOUT) as r:
                    if r.status == 200:
                        return url
            except Exception:
                continue
    return None


class Command(BaseCommand):
    help = "Populate product cover_url / banner_url from Steam CDN artwork."

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Replace artwork on products that already have it.",
        )

    def handle(self, *args, **options):
        overwrite = options["overwrite"]
        updated = skipped = failed = 0

        for product in Product.objects.all():
            if product.cover_url and not overwrite:
                skipped += 1
                continue

            appid = KNOWN_APPIDS.get(product.name) or resolve_appid(product.name)
            if not appid:
                self.stdout.write(self.style.WARNING(f"  no appid: {product.name}"))
                failed += 1
                continue

            cover = first_available(appid, PORTRAIT)
            if not cover:
                self.stdout.write(self.style.WARNING(f"  no artwork: {product.name}"))
                failed += 1
                continue

            product.cover_url = cover
            product.banner_url = first_available(appid, WIDE) or ""
            product.save(update_fields=["cover_url", "banner_url", "updated_at"])
            updated += 1
            self.stdout.write(f"  {product.name}  <- appid {appid}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nArtwork: {updated} updated, {skipped} already had it, {failed} failed."
            )
        )
