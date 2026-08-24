"""Shrink uploaded artwork before it ever reaches disk.

Store art comes as 2-4 MB JPEGs, and the shop grid renders every cover at a
few hundred pixels wide. Left alone, a page of thirty cards ships eighty
megabytes off a single droplet. So each upload is rotated upright, capped at
a sensible width, and re-encoded as WebP on its way through the model.
"""

from io import BytesIO
from pathlib import Path

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

# Cards render around 300px wide, so 800 leaves room for retina screens and
# for the larger cover on the product page without paying for the original.
COVER_MAX_WIDTH = 800
WEBP_QUALITY = 82


def is_fresh_upload(fieldfile):
    """True only when this save carries bytes that are not in storage yet.

    Django marks a field committed once its content is written, so anything
    uncommitted arrived with this request; re-saving a row (reordering,
    editing alt text) leaves it committed and already compressed. Asking
    `fieldfile.file` instead would look right and quietly open the stored
    file to answer, holding a handle the caller never asked for.
    """
    return bool(fieldfile) and not fieldfile._committed


def needs_work(fp, max_width=COVER_MAX_WIDTH):
    """Has this file already been through here? Used by the backfill command."""
    with Image.open(fp) as image:
        return image.format != "WEBP" or image.width > max_width


def render_webp(fp, max_width=COVER_MAX_WIDTH):
    """Resized, upright WebP bytes for the image in `fp`."""
    with Image.open(fp) as opened:
        # Phone cameras record rotation in EXIF rather than in the pixels.
        image = ImageOps.exif_transpose(opened)
        image = image.convert("RGBA" if _has_alpha(image) else "RGB")

        if image.width > max_width:
            height = round(image.height * max_width / image.width)
            image = image.resize((max_width, height), Image.LANCZOS)

        buffer = BytesIO()
        image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)

    return buffer.getvalue()


def compress_to_webp(fieldfile, max_width=COVER_MAX_WIDTH):
    """Replace the pending upload with a resized WebP, same stem, no DB write."""
    source = fieldfile.file
    source.seek(0)
    data = render_webp(source, max_width)
    fieldfile.save(webp_name(fieldfile.name), ContentFile(data), save=False)


def webp_name(name):
    return f"{Path(name).stem}.webp"


def _has_alpha(image):
    return image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    )
