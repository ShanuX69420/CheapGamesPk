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
    # Steam's names have moved on from ours — renamed after a relaunch, sold
    # only as a bigger edition, or re-released on Steam years later — and a
    # bundle takes its newest game, which is the one that sets the specs.
    "Crimson Desert": 3321460,
    "Sekiro: Shadows Die Twice": 814380,
    "Control": 870780,
    "Atlas Fallen": 1230530,
    "Horizon Forbidden West": 2420110,
    "Horizon Zero Dawn": 1151640,
    "The Witcher 3: Wild Hunt": 292030,
    # Not "Black Flag Resynced", the remake that now tops the search.
    "Assassin's Creed IV: Black Flag": 242050,
    "Dying Light 2": 534380,
    "Forza Horizon 4": 1293830,
    "Mandragora: Whispers of the Witch": 1721060,
    "Football Manager 2024": 2252570,
    "EA Sports FIFA 23": 1811260,
    "WWE 2K23": 1942660,
    "Grand Theft Auto V": 3240220,
    "Grand Theft Auto V — Rockstar Key": 3240220,
    "Grand Theft Auto IV: The Complete Edition": 12210,
    "Battlefield Hardline": 1238880,
    "Vampire: The Masquerade — Bloodlines 2": 532790,
    "Microsoft Flight Simulator 2020 — Game Pass PC 12 Months": 1250410,
    "Hollow Knight + Silksong Bundle": 1030300,
    "Subnautica + Below Zero Bundle": 848450,
    "Batman: Arkham Collection": 208650,
    "Battlefield 1 + Battlefield V": 1238810,
    "BioShock: The Collection": 8870,
    "Hellblade 1 + 2 Bundle": 2461850,
    "Mafia Trilogy": 1030840,
    "Metro Collection (4 Games)": 412020,
    "Middle-earth: Shadow of Mordor + Shadow of War Bundle": 356190,
    "Resident Evil 2 + 3 + 4 Remake Bundle": 2050650,
    "Resident Evil 2 + 3 Remake Bundle": 952060,
    "Tomb Raider Trilogy": 750920,
    "Wolfenstein Collection": 1056960,
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
