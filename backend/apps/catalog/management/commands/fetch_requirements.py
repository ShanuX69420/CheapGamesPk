"""
Fill in system requirements for products from Steam's store API.

The same public, keyless Steam data the artwork comes from: resolve the
listing to an appid, then take the minimum and recommended PC specs off its
store entry and flatten Steam's HTML into the plain "Label: value" lines the
admin edits and the product page lays out as two columns.

    python manage.py fetch_requirements --dry-run
    python manage.py fetch_requirements
    python manage.py fetch_requirements --slug control --overwrite

Wrong specs are worse than none, so a match has to be exact. Listing names
carry an edition or a "— Steam Key" tail Steam does not, so words come off the
end until a search returns a title whose name is the query itself — never the
top hit by default, which for "Watch Dogs" is Watch Dogs 2. Among exact names
(Dead Space 2008 and the 2023 remake share one) the release year has to agree
with the listing's. Anything that still does not resolve is reported and left
empty; pin it in KNOWN_APPIDS.
"""

import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape

from django.core.management.base import BaseCommand

from apps.catalog.models import Product

from .fetch_artwork import KNOWN_APPIDS, TIMEOUT, UA

SEARCH_URL = "https://store.steampowered.com/api/storesearch/?l=english&cc=US&term={}"
# Without a country Steam answers for the caller's own, and some publishers'
# games (Watch Dogs) come back empty for Pakistan.
DETAILS_URL = "https://store.steampowered.com/api/appdetails?appids={}&l=english&cc=US"

# The store API rate-limits at roughly 200 calls in five minutes.
PAUSE = 1.6

# Steam dates a game from its Steam launch, which for Ubisoft's back catalogue
# came years after the real one (Far Cry 6: 2021, on Steam 2023). A remake
# under the same name is further off than that either way.
LATE_PORT = 3

# Lines Steam prints that say nothing to someone buying an offline account:
# the 64-bit notice repeats the OS line, the network line describes the online
# features this account does not have, and the asterisked footnote is Steam's
# own client support notice.
DROP = re.compile(r"^(requires a 64-bit|network:|\*)", re.I)
NOTE_LIMIT = 200


def _get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())


# "Mortal Shell 2" is "Mortal Shell II" on Steam. No "i" or "x": both are
# words in game titles, and Mega Man X is not Mega Man 10.
NUMERALS = {"ii": "2", "iii": "3", "iv": "4", "v": "5", "vi": "6", "vii": "7", "viii": "8", "ix": "9"}


def _norm(name):
    name = re.sub(r"[™®©]", "", name.casefold())
    name = re.sub(r"[^a-z0-9]+", " ", name.replace("&", " "))
    return " ".join(NUMERALS.get(word, word) for word in name.split())


def _numbers(name):
    return {word for word in _norm(name).split() if word.isdigit()}


def queries(name):
    """
    The listing's name, then shorter versions of it that keep its numbers.

    "Yakuza Kiwami 3 + Dark Ties" finds nothing (Steam's search chokes on the
    plus) and may shorten to "Yakuza Kiwami 3", but never to "Yakuza Kiwami",
    which is another game released two months before it.
    """
    words = name.split(" — ")[0].split()
    shorter = (" ".join(words[:n]) for n in range(len(words), 0, -1))
    return [q for q in shorter if _numbers(q) == _numbers(name)]


def details(appid):
    time.sleep(PAUSE)
    data = _get(DETAILS_URL.format(appid)).get(str(appid), {})
    return data.get("data") if data.get("success") else None


def resolve(product):
    """(appid, Steam's app data) for the listing, or (None, None)."""
    if product.name in KNOWN_APPIDS:
        appid = KNOWN_APPIDS[product.name]
        return appid, details(appid)

    year = product.release_date.year if product.release_date else None
    full = _norm(product.name.split(" — ")[0])
    for query in queries(product.name):
        time.sleep(PAUSE)
        items = _get(SEARCH_URL.format(urllib.parse.quote(query))).get("items", [])
        # The whole name first: a shorter query can turn up the listing itself
        # ("Yakuza Kiwami 3" finds "Yakuza Kiwami 3 & Dark Ties").
        apps = [i for i in items if i.get("type") == "app"]
        exact = [i for i in apps if _norm(i["name"]) == full] or [
            i for i in apps if _norm(i["name"]) == _norm(query)
        ]
        for item in exact:
            data = details(item["id"])
            if not data:
                continue
            found = re.search(r"\d{4}", (data.get("release_date") or {}).get("date", ""))
            if year is None or (found and -1 <= int(found.group()) - year <= LATE_PORT):
                return item["id"], data
        if exact:
            # The name matched and the year did not: a shorter query would only
            # reach further from the game, not closer to it.
            break
    return None, None


def flatten(html, heading):
    """One of Steam's requirement blocks as plain lines under our own heading."""
    text = re.sub(r"<br\s*/?>|</li>|</p>", "\n", html or "")
    text = unescape(re.sub(r"<[^>]+>", "", text))
    lines = []
    for line in text.splitlines():
        line = " ".join(line.split())
        if not line or DROP.match(line) or re.fullmatch(r"(minimum|recommended):?", line, re.I):
            continue
        # "OS *:" — the asterisk points at the footnote dropped above.
        line = re.sub(r"^([^:]{1,30}?)\s*\*\s*:", r"\1:", line)
        # Publishers run their notes on for a paragraph of upscaling caveats
        # and legal hedging; the first sentence is the one that says something.
        if line.startswith("Additional Notes:") and len(line) > NOTE_LIMIT:
            line = line[: line.find(". ") + 1] if 0 < line.find(". ") < NOTE_LIMIT else ""
        if line:
            lines.append(line)
    return [heading, *lines] if lines else []


def requirements(data):
    specs = data.get("pc_requirements") or {}
    if not isinstance(specs, dict):  # Steam sends [] when there are none
        return ""
    blocks = [
        flatten(specs.get("minimum"), "Minimum"),
        flatten(specs.get("recommended"), "Recommended"),
    ]
    return "\n\n".join("\n".join(b) for b in blocks if b)


class Command(BaseCommand):
    help = "Populate product system_requirements from Steam's store API."

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Replace requirements on products that already have them.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report the Steam match for each product and write nothing.",
        )
        parser.add_argument("--slug", help="Only this product.")

    def handle(self, *args, **options):
        products = Product.objects.filter(is_active=True).order_by("name")
        if options["slug"]:
            products = products.filter(slug=options["slug"])

        updated = skipped = failed = 0
        for product in products:
            if product.system_requirements and not options["overwrite"]:
                skipped += 1
                continue

            try:
                appid, data = resolve(product)
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f"  Steam error: {product.name} ({exc})"))
                failed += 1
                continue
            text = requirements(data) if data else ""
            if not text:
                reason = "no specs on Steam" if appid else "no exact Steam match"
                self.stdout.write(self.style.WARNING(f"  {reason}: {product.name}"))
                failed += 1
                continue

            self.stdout.write(f"  {product.name}  <- {data['name']} ({appid})")
            updated += 1
            if not options["dry_run"]:
                product.system_requirements = text
                product.save(update_fields=["system_requirements", "updated_at"])

        verb = "would update" if options["dry_run"] else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"\nRequirements: {verb} {updated}, {skipped} already had them, {failed} not found."
            )
        )
