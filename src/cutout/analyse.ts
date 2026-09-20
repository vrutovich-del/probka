import type { Box, CutoutStats } from './types';

/**
 * Where the cap sits in the frame and what colour its rim is, read off a finished mask. Kept out of
 * the worker so the bundled sample — which arrives already cut out — measures itself the same way,
 * without pulling the background-removal library onto the main thread.
 */
export function analyse(image: ImageData, mask: Uint8Array): CutoutStats {
  const { width, height } = image;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let opaque = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = mask[y * width + x] ?? 0;
      if (a >= 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      if (a >= 128) opaque++;
    }
  }
  const bbox: Box =
    maxX < 0 ? { x: 0, y: 0, w: width, h: height } : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

  // Rim colour: solid pixels in the outer fifth of the cap's radius.
  const cx = bbox.x + bbox.w / 2;
  const cy = bbox.y + bbox.h / 2;
  const radius = Math.max(bbox.w, bbox.h) / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = bbox.y; y < bbox.y + bbox.h; y++) {
    for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
      const i = y * width + x;
      if ((mask[i] ?? 0) < 200) continue;
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d < 0.8 || d > 1.0) continue;
      r += image.data[i * 4] ?? 0;
      g += image.data[i * 4 + 1] ?? 0;
      b += image.data[i * 4 + 2] ?? 0;
      n++;
    }
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  const rimColor = n > 0 ? `#${hex(r / n)}${hex(g / n)}${hex(b / n)}` : '#8a713a';

  return { width, height, bbox, opaqueFraction: opaque / (width * height), rimColor };
}
