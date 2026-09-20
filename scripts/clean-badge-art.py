#!/usr/bin/env python3
"""Prepare the badge art for src/assets/badges/ — a one-off, not part of the build.

    python scripts/clean-badge-art.py <folder with the eight source PNGs>

Needs Pillow and SciPy, which the app itself does not: run it only when the owner supplies new art.
The generator that drew these badges left three kinds of mess behind — a flat studio ground still
fully opaque, the ghost of a screenshot around the subject, and holes punched inside it. This keys
the ground out, drops the leftovers, fills the holes, then trims and squares each badge to 256 px.
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SIZE = 256
MARGIN = 8  # transparent padding inside the square
QUALITY = 90

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'assets', 'badges')

# Source file -> the BadgeId it belongs to, kebab-cased as the import in src/lib/badges.ts spells it.
NAMES = {
    'pervaya_kryshka.png': 'first-cap',
    'desyatok.png': 'ten-finder',
    'polsotni.png': 'half-hundred',
    'vernost_brendu.png': 'brand-loyal',
    'okhotnik_za_redkimi.png': 'rare-hunter',
    'seriya_sobrana.png': 'set-complete',
    'duelyant.png': 'duelist',
    '7_dney_podryad.png': 'streak-7',
}

# Each badge was framed differently, so a couple need their leftovers named.
OPTIONS = {
    'vernost_brendu.png': dict(dark_limit=60),
    'okhotnik_za_redkimi.png': dict(inset=10),
    'seriya_sobrana.png': dict(inset=10),
}


def alpha_from_flat_background(rgb):
    """Soft key for art that arrived fully opaque on a flat studio ground."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(np.float64)
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(rgb.astype(np.float64) - bg, axis=2)
    lo, hi = 22.0, 55.0  # below lo it is ground, above hi it is subject, in between a soft edge
    return np.clip((dist - lo) / (hi - lo), 0, 1)


def keep_main_parts(solid, keep_ratio=0.12):
    """Largest blob, plus any other blob at least `keep_ratio` of it — a badge may be several pieces."""
    labels, count = ndimage.label(solid)
    if count == 0:
        return solid
    areas = ndimage.sum(solid, labels, range(1, count + 1))
    wanted = [i + 1 for i, area in enumerate(areas) if area >= areas.max() * keep_ratio]
    return np.isin(labels, wanted)


def drop_dark_background(solid, rgb, limit):
    """Near-black mass that reaches the frame edge is ground the generator failed to cut, not art."""
    dark = rgb.max(axis=2) < limit
    seeds = np.zeros_like(dark)
    seeds[0], seeds[-1], seeds[:, 0], seeds[:, -1] = True, True, True, True
    labels, _ = ndimage.label(dark)
    touching = np.unique(labels[seeds & dark])
    return solid & ~np.isin(labels, touching[touching > 0])


def clean(path, out, inset=4, dark_limit=0):
    im = Image.open(path).convert('RGBA')
    if inset:
        im = im.crop((inset, inset, im.width - inset, im.height - inset))
    data = np.asarray(im).astype(np.float64)
    rgb, alpha = data[..., :3], data[..., 3] / 255.0
    if (alpha < 0.5).mean() < 0.01:
        alpha = alpha_from_flat_background(rgb)

    solid = alpha >= 0.5
    if dark_limit:
        solid = drop_dark_background(solid, rgb, dark_limit)
    # Opening first: the ghost of a screenshot is thin, the badge is not.
    solid = ndimage.binary_opening(solid, np.ones((5, 5)))
    solid = keep_main_parts(solid)
    solid = ndimage.binary_fill_holes(solid)
    solid = ndimage.binary_closing(solid, np.ones((9, 9)))
    solid = ndimage.binary_fill_holes(solid)

    # Opaque inside, the original soft values kept only in a band along the contour.
    inside = ndimage.binary_erosion(solid, np.ones((5, 5)))
    out_alpha = np.where(inside, 1.0, np.where(solid, np.maximum(alpha, 0.25), 0.0))

    cleaned = Image.fromarray(np.dstack([rgb, out_alpha * 255]).astype(np.uint8), 'RGBA')
    cleaned = cleaned.crop(cleaned.getbbox())
    cleaned.thumbnail((SIZE - MARGIN * 2, SIZE - MARGIN * 2), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(cleaned, ((SIZE - cleaned.width) // 2, (SIZE - cleaned.height) // 2))
    canvas.save(out, 'WEBP', quality=QUALITY, method=6)


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    source = sys.argv[1]
    for name, slug in NAMES.items():
        out = os.path.join(DEST, f'{slug}.webp')
        clean(os.path.join(source, name), out, **OPTIONS.get(name, {}))
        print(f'{slug:14s} {os.path.getsize(out) // 1024:3d} KB')
