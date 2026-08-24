"""
Create listings in bulk from a JSON batch file.

Adding a game by hand in the admin means retyping the same activation steps and
the same limitations every time, and those two blocks have to read identically
across the store — a buyer comparing two listings should not find two different
accounts of what offline mode costs them. So they live here, and a batch file
carries only what actually differs per game: the name, the price, the artwork
and the words about the game itself.

    python manage.py import_products games.json --dry-run
    python manage.py import_products games.json

Re-running is safe. A name already in the catalog is left alone unless
--update is passed, which refreshes the fields in the file and leaves the rest
(and anything you have since edited in the admin) untouched.
"""

import json
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalog.models import Category, Platform, Product

from .fetch_artwork import PORTRAIT, WIDE, first_available, resolve_appid

# The two blocks every offline-account listing shares, worded as they already
# are on the live listings. Overridable per game in the batch file, but the
# point is that nobody has to.
ACTIVATION_INSTRUCTIONS = (
    "1. Install Steam and sign in with the details we send you in the chat.\n"
    "2. Let the game finish downloading.\n"
    "3. In Steam, open the top-left menu and choose Go Offline. Stay in Offline\n"
    "   Mode whenever you play.\n"
    "4. Do not change the account password or email.\n\n"
    "Stuck on any step? Message us on WhatsApp and we will walk you through it."
)

LIMITATIONS = (
    "Single-player only. Online modes, multiplayer and cloud saves are not part "
    "of this, and achievements earn on the account we provide rather than on "
    "your own profile.\n"
    "The account has to stay in Steam's Offline Mode. Changing its password or "
    "email ends access — for you as well as for everyone else."
)

# What we sell unless a batch says otherwise. Product's own defaults already
# cover the rest — offline account, Global, active, not featured.
DEFAULT_PLATFORM = "Steam"

# Fields a listing carries verbatim from the batch file.
COPY_FIELDS = [
    "short_description",
    "description",
    "system_requirements",
    "activation_instructions",
    "limitations",
    "cover_url",
    "banner_url",
    "region",
    "meta_title",
    "meta_description",
]


class Command(BaseCommand):
    help = "Create or update listings from a JSON batch file."

    def add_arguments(self, parser):
        parser.add_argument("path", help="JSON file: a list of listing objects.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would happen and write nothing.",
        )
        parser.add_argument(
            "--no-artwork",
            action="store_true",
            help="Skip the Steam artwork lookup and leave covers empty, to be filled in later.",
        )
        parser.add_argument(
            "--update",
            action="store_true",
            help="Refresh listings that already exist instead of skipping them.",
        )

    def handle(self, *args, **options):
        specs = self.load(Path(options["path"]))
        dry_run, update = options["dry_run"], options["update"]

        created = updated = skipped = 0
        for spec in specs:
            name = spec["name"]
            existing = Product.objects.filter(name=name).first()
            if existing and not update:
                self.stdout.write(f"  exists, left alone: {name}")
                skipped += 1
                continue

            fields = self.build(spec, artwork=not options["no_artwork"])
            if dry_run:
                verb = "would update" if existing else "would create"
                self.stdout.write(f"  {verb}: {name} — {fields['price']} "
                                  f"({', '.join(spec.get('categories', [])) or 'no categories'})")
                if not options["no_artwork"] and not fields.get("cover_url"):
                    self.stdout.write(self.style.WARNING(f"    no cover art for {name}"))
                continue

            with transaction.atomic():
                product = self.save(existing, spec, fields)

            if existing:
                self.stdout.write(f"  updated: {product.name}")
                updated += 1
            else:
                self.stdout.write(f"  created: {product.name} — {product.price}")
                created += 1

        if dry_run:
            self.stdout.write(self.style.SUCCESS(f"\nDry run over {len(specs)} listings. Nothing written."))
            return

        self.stdout.write(
            self.style.SUCCESS(
                f"\n{created} created, {updated} updated, {skipped} left alone. "
                f"{Product.objects.count()} listings in the catalog."
            )
        )

    # --- reading the batch ------------------------------------------------

    def load(self, path):
        if not path.exists():
            raise CommandError(f"No such file: {path}")
        try:
            specs = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"{path} is not valid JSON: {exc}") from exc
        if not isinstance(specs, list):
            raise CommandError(f"{path} should hold a list of listings.")

        # Validate the whole batch before touching the database — a typo in the
        # last entry should not leave the first half of it half-posted.
        seen = set()
        for i, spec in enumerate(specs, 1):
            where = f"entry {i}"
            if not isinstance(spec, dict):
                raise CommandError(f"{where} is not an object.")
            name = (spec.get("name") or "").strip()
            if not name:
                raise CommandError(f"{where} has no name.")
            if name.casefold() in seen:
                raise CommandError(f"{where}: '{name}' appears twice in the file.")
            seen.add(name.casefold())
            try:
                Decimal(str(spec["price"]))
            except (KeyError, InvalidOperation) as exc:
                raise CommandError(f"{where} ('{name}') has no usable price.") from exc
            if spec.get("release_date"):
                try:
                    date.fromisoformat(spec["release_date"])
                except ValueError as exc:
                    raise CommandError(
                        f"{where} ('{name}'): release_date must be YYYY-MM-DD."
                    ) from exc
        return specs

    def build(self, spec, artwork=True):
        """
        Everything that lands on the Product, artwork resolved if need be.

        Only what the file actually says is included, because these same fields
        are written straight onto an existing listing by --update: a key left
        out has to mean "leave it alone" rather than "set it back to nothing",
        or a batch re-run to correct one price would quietly strip the release
        dates off everything in it.

        The two shared blocks are the exception and are rewritten every time —
        they are here precisely so that every listing words them identically.
        """
        fields = {
            "price": Decimal(str(spec["price"])),
            "activation_instructions": ACTIVATION_INSTRUCTIONS,
            "limitations": LIMITATIONS,
        }
        if "product_type" in spec:
            fields["product_type"] = spec["product_type"]
        if spec.get("compare_at_price"):
            fields["compare_at_price"] = Decimal(str(spec["compare_at_price"]))
        if spec.get("release_date"):
            fields["release_date"] = date.fromisoformat(spec["release_date"])
        for flag in ("is_featured", "is_active"):
            if flag in spec:
                fields[flag] = spec[flag]
        for field in COPY_FIELDS:
            if spec.get(field):
                fields[field] = spec[field]

        if artwork and not fields.get("cover_url"):
            fields.update(self.artwork(spec))
        return fields

    def artwork(self, spec):
        """
        Steam CDN art, by appid. Resolving by name is a fallback and a fuzzy
        one — 'Mortal Kombat 1' returns MK11 — so a batch file should carry the
        appid, and a miss is reported rather than guessed at.
        """
        appid = spec.get("appid") or resolve_appid(spec["name"])
        if not appid:
            self.stdout.write(self.style.WARNING(f"    no appid for {spec['name']}"))
            return {"cover_url": "", "banner_url": ""}

        cover = first_available(appid, PORTRAIT)
        if not cover:
            self.stdout.write(self.style.WARNING(f"    no artwork for {spec['name']}"))
        return {
            "cover_url": cover or "",
            "banner_url": first_available(appid, WIDE) or "",
        }

    # --- writing ----------------------------------------------------------

    def save(self, existing, spec, fields):
        if existing:
            for key, value in fields.items():
                setattr(existing, key, value)
            if spec.get("platform"):
                existing.platform = self.platform(spec["platform"])
            existing.save()
            product = existing
        else:
            product = Product.objects.create(
                name=spec["name"],
                platform=self.platform(spec.get("platform", DEFAULT_PLATFORM)),
                **fields,
            )

        if spec.get("categories"):
            product.categories.set(self.category(name) for name in spec["categories"])
        return product

    def platform(self, name):
        return Platform.objects.get_or_create(
            name=name,
            defaults={"sort_order": Platform.objects.count() + 1},
        )[0]

    def category(self, name):
        return Category.objects.get_or_create(
            name=name,
            defaults={"sort_order": Category.objects.count() + 1},
        )[0]
