"""
Create listings in bulk from a JSON batch file.

Adding a game by hand in the admin means retyping the same activation steps and
the same limitations every time, and those two blocks have to read identically
across the store — a buyer comparing two listings should not find two different
accounts of what offline mode costs them. So they live here, and a batch file
carries only what actually differs per game: the name, the price, the artwork
and the words about the game itself. Which client the steps name follows the
platform the listing sells on, so a Ubisoft game does not tell its buyer to
install Steam.

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

from apps.catalog.models import Category, Platform, Product, ProductType

from .fetch_artwork import PORTRAIT, WIDE, first_available, resolve_appid

# The two blocks every offline-account listing shares, worded as they already
# are on the live listings. Only the client moves between platforms — the words
# around it are written once, so a buyer comparing a Ubisoft listing with a
# Steam one does not find two different accounts of what offline mode costs
# them. Overridable per game in the batch file, but the point is that nobody
# has to.
ACTIVATION_INSTRUCTIONS = (
    "1. Install {client} and sign in with the details we send you in the chat.\n"
    "2. Let the game finish downloading.\n"
    "3. {go_offline} Stay in Offline Mode whenever you play.\n"
    "4. Do not change the account password or email.\n\n"
    "Stuck on any step? Message us on WhatsApp and we will walk you through it."
)

LIMITATIONS = (
    "Single-player only. Online modes, multiplayer and cloud saves are not part "
    "of this, and achievements earn on the account we provide rather than on "
    "your own profile.\n"
    "The account has to stay in {client}'s Offline Mode. Changing its password "
    "or email ends access — for you as well as for everyone else."
)

# A full-access account is the opposite trade from an offline one: the buyer
# gets the account itself, fresh and unplayed, and everything online works
# because nothing is being hidden from the client. What it costs instead is the
# first month — the account stays on our email long enough that we can still
# recover it if something goes wrong, and moves to the buyer's after that. Sold
# on the same platforms as the offline accounts, so which client to name comes
# from CLIENTS below; what makes a listing this rather than that is its
# product type.
FULL_ACCESS_ACTIVATION = (
    "1. Install {client} and sign in with the details we send you in the chat.\n"
    "2. Change the password straight away and keep the new one somewhere safe.\n"
    "3. Let the game finish downloading and play it however you like — online "
    "included.\n"
    "4. After one month, change the account's email address to your own.\n\n"
    "Stuck on any step? Message us on WhatsApp and we will walk you through it."
)

FULL_ACCESS_LIMITATIONS = (
    "A fresh {client} account made for this sale with the game already on it "
    "and no hours played. The account is yours — online play, multiplayer, "
    "cloud saves and achievements all work as they would on any account of "
    "your own.\n"
    "Leave the email as delivered for the first month. While the account is "
    "still on our address we can recover it for you; once you have moved it to "
    "yours, it is entirely in your hands."
)

# The client a platform's offline mode lives in, and where the buyer finds it.
# A platform missing here has no house wording, so a batch selling on it has to
# bring its own rather than be handed somebody else's client by default.
CLIENTS = {
    "Steam": (
        "Steam",
        "In Steam, open the top-left menu and choose Go Offline.",
    ),
    "EA App": (
        "the EA app",
        "In the EA app, open the menu beside your avatar and choose Go Offline.",
    ),
    "Ubisoft Connect": (
        "Ubisoft Connect",
        "In Ubisoft Connect, open the top-left menu and choose Go Offline.",
    ),
}

# Game Pass does not word like an offline activation and is not sold like
# one: the buyer signs into an account that carries the subscription, and
# what they get is a year of the whole library rather than the one game whose
# listing they came in on. So it has its own two blocks, picked by platform
# like the others. The library itself is named on the storefront, in
# GamePassTerms.tsx — it rotates, and a batch file is the wrong place to keep
# chasing it.
GAME_PASS_PLATFORM = "Xbox Game Pass"

GAME_PASS_ACTIVATION = (
    "1. Open the Xbox app or the Microsoft Store on your PC and sign in "
    "with the details we send you in the chat.\n"
    "2. Find the game in the Game Pass library and let it finish "
    "installing.\n"
    "3. Play on your own Xbox Live account, so the achievements stay on "
    "your own profile.\n"
    "4. Do not change the account password or any other account detail.\n\n"
    "Stuck on any step? Message us on WhatsApp and we will walk you "
    "through it."
)

GAME_PASS_LIMITATIONS = (
    "A 12-month subscription on an account we provide, not a key — the game "
    "is not added to your own Microsoft account, and access runs for the 12 "
    "months from the date of purchase.\n"
    "Windows 10/11 PCs only; Xbox consoles are not supported. Minecraft, "
    "Sea of Thieves, Riot Games titles, Ubisoft+, EA Play and Activision "
    "games are not part of what this covers.\n"
    "One purchase — 1 PC. Changing the account password or email ends "
    "access — for you as well as for everyone else."
)

# The two blocks a listing has to carry itself when we have no wording for its
# platform.
HOUSE_BLOCKS = ["activation_instructions", "limitations"]

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
            platform = spec.get("platform", DEFAULT_PLATFORM)
            if not self.house_blocks(spec):
                missing = [f for f in HOUSE_BLOCKS if not spec.get(f)]
                if missing:
                    raise CommandError(
                        f"{where} ('{name}'): nothing here knows how a {platform} "
                        f"listing is activated, so the entry has to carry its own "
                        f"{' and '.join(missing)}."
                    )
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
        they are here precisely so that every listing on a platform words them
        identically.
        """
        fields = {"price": Decimal(str(spec["price"]))}
        fields.update(self.house_blocks(spec))
        if "product_type" in spec:
            fields["product_type"] = spec["product_type"]
        elif spec.get("platform") == GAME_PASS_PLATFORM:
            # An account with a subscription on it, not the offline activation
            # the model defaults to. The platform already says which it is, so
            # the batch file does not repeat it on every entry.
            fields["product_type"] = ProductType.ONLINE_ACCOUNT
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

    def house_blocks(self, spec):
        """The shared wording for whatever this listing sells.

        Nothing for a platform we have no wording for — load() has already
        made sure such an entry carries its own.
        """
        platform = spec.get("platform", DEFAULT_PLATFORM)
        if platform == GAME_PASS_PLATFORM:
            return {
                "activation_instructions": GAME_PASS_ACTIVATION,
                "limitations": GAME_PASS_LIMITATIONS,
            }
        client = CLIENTS.get(platform)
        if not client:
            return {}
        name, go_offline = client
        # Same platforms, opposite trade: an online listing on one of these is
        # the account sold outright, not an offline activation of it.
        if spec.get("product_type") == ProductType.ONLINE_ACCOUNT:
            return {
                "activation_instructions": FULL_ACCESS_ACTIVATION.format(client=name),
                "limitations": FULL_ACCESS_LIMITATIONS.format(client=name),
            }
        return {
            "activation_instructions": ACTIVATION_INSTRUCTIONS.format(
                client=name, go_offline=go_offline
            ),
            "limitations": LIMITATIONS.format(client=name),
        }

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
