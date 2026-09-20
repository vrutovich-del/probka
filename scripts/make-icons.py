#!/usr/bin/env python3
"""Draw the app icons from the splash mark — a one-off, not part of the build.

    python scripts/make-icons.py

Needs Pillow, which the app itself does not. The design has no app icon, so the mark is the one on
screen 01 (Cap Garage.dc.html line 420): an 84 px circle with a 3 px primary ring, holding a 52 px
circle with a 2 px dashed ring at half opacity. Everything is drawn at 4× and downsampled, because
Pillow has no antialiased stroke.
"""
import math
import os

from PIL import Image, ImageDraw

SS = 4  # supersample factor
BG = (11, 11, 11, 255)  # --color-bg-base
PRIMARY = (29, 185, 84)  # --color-primary
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'icons')

# Proportions of the splash mark, as fractions of the outer ring's diameter.
INNER = 52 / 84
OUTER_STROKE = 3 / 84
INNER_STROKE = 2 / 84
DASHES = 12  # dashes around the inner ring, half of each step drawn


def draw_mark(size, mark_fraction, background):
    """`mark_fraction` is the outer ring's diameter as a share of the icon's side."""
    px = size * SS
    im = Image.new('RGBA', (px, px), background)
    d = ImageDraw.Draw(im)
    centre = px / 2
    outer = px * mark_fraction
    ring = max(1, round(outer * OUTER_STROKE))
    box = [centre - outer / 2, centre - outer / 2, centre + outer / 2, centre + outer / 2]
    d.ellipse(box, outline=PRIMARY + (255,), width=ring)

    inner = outer * INNER
    inner_ring = max(1, round(inner * INNER_STROKE / INNER))
    ibox = [centre - inner / 2, centre - inner / 2, centre + inner / 2, centre + inner / 2]
    # The dashed ring is drawn at half opacity onto its own layer, as the splash has it.
    dashes = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    dd = ImageDraw.Draw(dashes)
    step = 360 / DASHES
    for i in range(DASHES):
        dd.arc(ibox, start=i * step, end=i * step + step / 2, fill=PRIMARY + (255,), width=inner_ring)
    im.alpha_composite(Image.blend(Image.new('RGBA', (px, px), (0, 0, 0, 0)), dashes, 0.5))
    return im.resize((size, size), Image.LANCZOS)


def save(name, size, mark_fraction, background):
    path = os.path.join(DEST, name)
    draw_mark(size, mark_fraction, background).save(path, optimize=True)
    print(f'{name:28s} {size}x{size}  {os.path.getsize(path) // 1024 or 1} KB')


if __name__ == '__main__':
    os.makedirs(DEST, exist_ok=True)
    # Transparent ground for the browser tab, the app's own ground everywhere it becomes a tile.
    save('favicon.png', 64, 0.80, (0, 0, 0, 0))
    save('icon-192.png', 192, 0.68, BG)
    save('icon-512.png', 512, 0.68, BG)
    # Maskable: launchers crop to a circle, so the mark stays inside the 80 % safe area.
    save('icon-512-maskable.png', 512, 0.52, BG)
    # iOS draws its own rounded corners and does not honour transparency.
    save('apple-touch-icon.png', 180, 0.66, BG)
    assert math.isclose(INNER, 52 / 84)
