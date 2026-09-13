/**
 * Cleans the model's soft mask for one solid object, a bottle cap:
 *   1. keeps a single connected component — the biggest, most compact one nearest the centre — and drops
 *      the speckles the model leaves on a textured surface;
 *   2. fills enclosed holes (dark print the model was unsure about);
 *   3. makes the inside fully opaque and keeps the model's soft values only in a 2 px band at the edge.
 * Only the mask changes. The photo's pixels are never touched.
 */

const SOLID = 128; // alpha at or above this counts as "object"
const EDGE = 2; // px of soft edge kept on each side of the contour

interface Component {
  id: number;
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sumX: number;
  sumY: number;
}

export function cleanMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const n = width * height;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = (mask[i] ?? 0) >= SOLID ? 1 : 0;

  const best = pickComponent(label(solid, width, height), width, height);
  const out = new Uint8Array(n);
  if (!best) return out;

  const { labels, component } = best;
  const filled = new Uint8Array(n);
  for (let i = 0; i < n; i++) filled[i] = labels[i] === component.id ? 1 : 0;
  const holes = enclosedHoles(filled, width, height);
  for (let i = 0; i < n; i++) if (holes[i]) filled[i] = 1;

  const core = morph(filled, width, height, EDGE, false);
  const band = morph(filled, width, height, EDGE, true);
  for (let i = 0; i < n; i++) {
    if (core[i]) out[i] = 255;
    else if (band[i]) out[i] = holes[i] ? 255 : (mask[i] ?? 0);
  }
  return out;
}

/** 4-connected components of a binary image. Every pixel is pushed at most once, so the stack fits in n. */
function label(solid: Uint8Array, width: number, height: number): { labels: Int32Array; components: Component[] } {
  const n = width * height;
  const labels = new Int32Array(n);
  const stack = new Int32Array(n);
  const components: Component[] = [];
  for (let start = 0; start < n; start++) {
    if (!solid[start] || labels[start]) continue;
    const id = components.length + 1;
    const c: Component = { id, area: 0, minX: width, minY: height, maxX: -1, maxY: -1, sumX: 0, sumY: 0 };
    let sp = 0;
    stack[sp++] = start;
    labels[start] = id;
    while (sp > 0) {
      const p = stack[--sp] ?? 0;
      const x = p % width;
      const y = (p - x) / width;
      c.area++;
      c.sumX += x;
      c.sumY += y;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      const visit = (q: number) => {
        if (solid[q] && !labels[q]) {
          labels[q] = id;
          stack[sp++] = q;
        }
      };
      if (x > 0) visit(p - 1);
      if (x < width - 1) visit(p + 1);
      if (y > 0) visit(p - width);
      if (y < height - 1) visit(p + width);
    }
    components.push(c);
  }
  return { labels, components };
}

/** Area × fill ratio of its box × closeness to the centre: a disc near the middle beats a spray of speckles. */
function pickComponent(
  { labels, components }: { labels: Int32Array; components: Component[] },
  width: number,
  height: number,
): { labels: Int32Array; component: Component } | null {
  let best: Component | null = null;
  let bestScore = -1;
  const half = Math.hypot(width / 2, height / 2);
  for (const c of components) {
    const fill = c.area / ((c.maxX - c.minX + 1) * (c.maxY - c.minY + 1));
    const dist = Math.hypot(c.sumX / c.area - width / 2, c.sumY / c.area - height / 2) / half;
    const score = c.area * fill * (1 - 0.5 * dist);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best ? { labels, component: best } : null;
}

/** Pixels outside the object that cannot be reached from the image border. */
function enclosedHoles(object: Uint8Array, width: number, height: number): Uint8Array {
  const n = width * height;
  const outside = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const seed = (p: number) => {
    if (!object[p] && !outside[p]) {
      outside[p] = 1;
      stack[sp++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (sp > 0) {
    const p = stack[--sp] ?? 0;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) seed(p - 1);
    if (x < width - 1) seed(p + 1);
    if (y > 0) seed(p - width);
    if (y < height - 1) seed(p + width);
  }
  const holes = new Uint8Array(n);
  for (let i = 0; i < n; i++) holes[i] = !object[i] && !outside[i] ? 1 : 0;
  return holes;
}

/** Square dilation (any neighbour set) or erosion (all neighbours set) of radius r, as two separable passes. */
function morph(src: Uint8Array, width: number, height: number, r: number, dilate: boolean): Uint8Array {
  const n = width * height;
  const pass1 = new Uint8Array(n);
  const out = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let hit = dilate ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const xx = x + d;
        const v = xx >= 0 && xx < width ? (src[row + xx] ?? 0) : 0;
        if (dilate ? v : !v) {
          hit = dilate ? 1 : 0;
          break;
        }
      }
      pass1[row + x] = hit;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = dilate ? 0 : 1;
      for (let d = -r; d <= r; d++) {
        const yy = y + d;
        const v = yy >= 0 && yy < height ? (pass1[yy * width + x] ?? 0) : 0;
        if (dilate ? v : !v) {
          hit = dilate ? 1 : 0;
          break;
        }
      }
      out[y * width + x] = hit;
    }
  }
  return out;
}
