#!/usr/bin/env python3
"""Cuts the eight avatar faces out of the owner's sheet into round WebP files.

    python scripts/crop-avatars.py [design/avatars/source.jpg]

A one-off, like scripts/clean-badge-art.py: it needs Pillow, which the app does not, and it is run
by hand when the art changes rather than as part of the build. The sheet is nine tiles on a near
black ground — eight characters and the dashed circle, which the app draws itself as an icon. Each
tile is squared, masked to a circle with a soft edge and written at 192 px, which covers the largest
place an avatar appears (74 px on Profile) on a 2.5× screen.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets' / 'avatars'
SIZE = 192

# Tile boxes measured off the sheet, left to right and top to bottom: x, y, side. The name is what
# the key becomes in src/account/avatars.ts. The first tile is drawn selected on the sheet, so its
# box is the disc inside the green ring rather than the ring itself.
TILES = [
    ('alien', 108, 141, 283),
    ('monster', 465, 128, 311),
    ('chef', 834, 128, 311),
    ('kid', 1203, 128, 311),
    ('bird', 1562, 128, 309),
    ('dog', 95, 502, 311),
    ('granny', 465, 502, 311),
    ('bulb', 834, 502, 311),
]


def round_mask(size: int, inset: int = 2) -> Image.Image:
    """A circle with an antialiased edge: drawn big, blurred a touch, then shrunk. The inset trims
    the tile's own dark rim off the edge, so the face sits on the app's ground rather than on a
    hairline of the sheet's background."""
    scale = 4
    mask = Image.new('L', (size * scale, size * scale), 0)
    edge = inset * scale
    ImageDraw.Draw(mask).ellipse((edge, edge, size * scale - 1 - edge, size * scale - 1 - edge), fill=255)
    return mask.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'design' / 'avatars' / 'source.jpg'
    sheet = Image.open(source).convert('RGB')
    OUT.mkdir(parents=True, exist_ok=True)
    mask = round_mask(SIZE)

    for name, x, y, side in TILES:
        tile = sheet.crop((x, y, x + side, y + side)).resize((SIZE, SIZE), Image.LANCZOS)
        tile = tile.convert('RGBA')
        tile.putalpha(mask)
        path = OUT / f'{name}.webp'
        tile.save(path, 'WEBP', quality=88, method=6)
        print(f'{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
