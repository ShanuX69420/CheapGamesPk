"""Populate the store with demo data so the storefront has something to render."""

from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.catalog.models import Category, Platform, Product, ProductType
from apps.inventory.models import StockItem

PLATFORMS = [
    ("Steam", 1),
    ("EA App", 2),
    ("Ubisoft Connect", 3),
    ("Microsoft Store", 4),
    ("Epic Games", 5),
]

CATEGORIES = ["Action", "RPG", "Racing", "Sports", "Strategy", "Horror"]

PRODUCTS = [
    {
        "name": "Mortal Kombat 1 Premium Edition",
        "type": ProductType.OFFLINE_ACCOUNT,
        "platform": "Steam",
        "categories": ["Action"],
        "price": "550.00",
        "compare_at": "2900.00",
        "release": date(2023, 9, 19),
        "featured": True,
        "short": "Full Premium Edition with all DLC characters, activated offline on your own PC.",
        "stock": 8,
    },
    {
        "name": "EA Sports FC 26 Ultimate Edition",
        "type": ProductType.ONLINE_ACCOUNT,
        "platform": "EA App",
        "categories": ["Sports"],
        "price": "1450.00",
        "compare_at": "4200.00",
        "release": date(2025, 9, 26),
        "featured": True,
        "short": "Shared online account — Ultimate Team and online seasons playable.",
        "stock": 3,
    },
    {
        "name": "Assassin's Creed Shadows Gold Edition",
        "type": ProductType.OFFLINE_ACCOUNT,
        "platform": "Ubisoft Connect",
        "categories": ["Action", "RPG"],
        "price": "690.00",
        "compare_at": "3500.00",
        "release": date(2025, 3, 20),
        "featured": True,
        "short": "Gold Edition including the season pass, offline activation via Ubisoft Connect.",
        "stock": 5,
    },
    {
        "name": "Forza Horizon 6 Premium Edition",
        "type": ProductType.ONLINE_ACCOUNT,
        "platform": "Microsoft Store",
        "categories": ["Racing"],
        "price": "1290.00",
        "compare_at": "3900.00",
        "release": date(2026, 4, 14),
        "featured": False,
        "short": "Premium Edition with car pass and early access. Autoactivation.",
        "stock": 2,
    },
    {
        "name": "Resident Evil Requiem Deluxe",
        "type": ProductType.OFFLINE_ACCOUNT,
        "platform": "Steam",
        "categories": ["Horror", "Action"],
        "price": "780.00",
        "compare_at": "4100.00",
        "release": date(2026, 2, 27),
        "featured": True,
        "short": "Deluxe Edition with bonus content. Offline account, region free.",
        "stock": 6,
    },
    {
        "name": "Football Manager 2026 + In-Game Editor",
        "type": ProductType.OFFLINE_ACCOUNT,
        "platform": "Steam",
        "categories": ["Sports", "Strategy"],
        "price": "340.00",
        "compare_at": "1800.00",
        "release": date(2025, 11, 4),
        "featured": False,
        "short": "Includes the paid In-Game Editor add-on.",
        "stock": 12,
    },
    {
        "name": "Cyberpunk 2077: Ultimate Edition",
        "type": ProductType.KEY,
        "platform": "Steam",
        "categories": ["RPG", "Action"],
        "price": "1100.00",
        "compare_at": None,
        "release": date(2023, 12, 5),
        "featured": False,
        "short": "Genuine Steam key — base game plus Phantom Liberty. Global.",
        "stock": 4,
    },
    {
        "name": "Baldur's Gate 3 Digital Deluxe",
        "type": ProductType.OFFLINE_ACCOUNT,
        "platform": "Steam",
        "categories": ["RPG", "Strategy"],
        "price": "820.00",
        "compare_at": "3600.00",
        "release": date(2023, 8, 3),
        "featured": False,
        "short": "Digital Deluxe with soundtrack and bonus items.",
        "stock": 0,
    },
]

LIMITATIONS = (
    "Online multiplayer is not available on offline accounts.\n"
    "Steam Cloud saves and Family Sharing are disabled.\n"
    "Activation is lost if you reinstall Windows, change major hardware, "
    "or verify/replace game files."
)

INSTRUCTIONS = (
    "1. Log out of your own account and close the client completely.\n"
    "2. Sign in with the credentials above.\n"
    "3. Wait for the library to sync, then switch the client to Offline Mode.\n"
    "4. Launch the game. Stay in offline mode from this point on.\n\n"
    "Need help? Contact support with your order number."
)


class Command(BaseCommand):
    help = "Seed demo catalog and stock data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete existing catalog data before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            StockItem.objects.all().delete()
            Product.objects.all().delete()
            Category.objects.all().delete()
            Platform.objects.all().delete()
            self.stdout.write(self.style.WARNING("Existing catalog data deleted."))

        platforms = {
            name: Platform.objects.get_or_create(name=name, defaults={"sort_order": order})[0]
            for name, order in PLATFORMS
        }
        categories = {
            name: Category.objects.get_or_create(name=name, defaults={"sort_order": i})[0]
            for i, name in enumerate(CATEGORIES)
        }

        for spec in PRODUCTS:
            product, created = Product.objects.get_or_create(
                name=spec["name"],
                defaults={
                    "product_type": spec["type"],
                    "platform": platforms[spec["platform"]],
                    "price": Decimal(spec["price"]),
                    "compare_at_price": Decimal(spec["compare_at"]) if spec["compare_at"] else None,
                    "release_date": spec["release"],
                    "is_featured": spec["featured"],
                    "short_description": spec["short"],
                    "description": spec["short"],
                    "region": "Region Free",
                    "limitations": LIMITATIONS if spec["type"] != ProductType.KEY else "",
                    "activation_instructions": INSTRUCTIONS,
                    "system_requirements": (
                        "OS: Windows 10 64-bit\nCPU: Intel Core i5-6600K\n"
                        "RAM: 8 GB\nGPU: NVIDIA GTX 1060 6GB\nStorage: 100 GB"
                    ),
                },
            )
            product.categories.set(categories[c] for c in spec["categories"])

            if created and spec["stock"]:
                StockItem.objects.bulk_create(
                    StockItem(
                        product=product,
                        label=f"demo-{n + 1:02d}",
                        payload=f"demo_user_{product.pk}_{n + 1}:demo_password_{n + 1}",
                    )
                    for n in range(spec["stock"])
                )

            verb = "created" if created else "exists"
            self.stdout.write(f"  {verb}: {product.name} ({spec['stock']} units)")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {Product.objects.count()} products, "
                f"{StockItem.objects.count()} stock units."
            )
        )
