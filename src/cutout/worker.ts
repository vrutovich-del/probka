/**
 * Background removal, off the main thread.
 *
 * The photo is decoded (EXIF orientation applied), downscaled to ≤1024 on its long edge and handed to
 * @imgly/background-removal for a mask only. The cutout is the same pixels with the mask as alpha —
 * nothing else touches the RGB values. Model and runtime come from /cutout/ on our own origin.
 */
import { preload, segmentForeground, type Config } from '@imgly/background-removal';
import { analyse } from './analyse';
import { cleanMask } from './cleanMask';
import type { CutoutDevice, CutoutResult, WorkerRequest, WorkerResponse } from './types';

const MAX_EDGE = 1024;
const THUMB_EDGE = 256;
const PUBLIC_PATH = new URL(`${import.meta.env.BASE_URL}cutout/`, self.location.origin).href;

const scope = self as unknown as {
  postMessage(message: WorkerResponse): void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

const hasWebGpu = 'gpu' in navigator && (navigator as { gpu?: unknown }).gpu !== undefined;
let device: CutoutDevice = hasWebGpu ? 'gpu' : 'cpu';

/** Bytes the current device needs, for one combined progress figure across model + runtime files. */
let downloadTotal = 0;
const downloadedByKey = new Map<string, number>();
let activeId: number | null = null;

function config(): Config {
  const model = device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8';
  return {
    publicPath: PUBLIC_PATH,
    device,
    model,
    rescale: true,
    output: { format: 'image/x-alpha8' },
    progress: (key, current) => {
      if (!key.startsWith('fetch:')) return;
      downloadedByKey.set(key, current);
      let loaded = 0;
      for (const n of downloadedByKey.values()) loaded += n;
      scope.postMessage({
        type: 'progress',
        id: activeId,
        progress: { phase: 'download', loaded: Math.min(loaded, downloadTotal), total: downloadTotal },
      });
    },
  };
}

async function resourceKeys(): Promise<string[]> {
  const runtime = device === 'gpu' ? 'ort-wasm-simd-threaded.jsep' : 'ort-wasm-simd-threaded';
  return [
    `/models/${device === 'gpu' ? 'isnet_fp16' : 'isnet_quint8'}`,
    `/onnxruntime-web/${runtime}.wasm`,
    `/onnxruntime-web/${runtime}.mjs`,
  ];
}

async function measureDownload(): Promise<void> {
  const res = await fetch(new URL('resources.json', PUBLIC_PATH));
  if (!res.ok) throw new Error(`resources.json: HTTP ${res.status} — run npm run cutout-model`);
  const map = (await res.json()) as Record<string, { size: number } | undefined>;
  downloadTotal = 0;
  for (const key of await resourceKeys()) downloadTotal += map[key]?.size ?? 0;
  downloadedByKey.clear();
}

let warm: Promise<void> | null = null;

/** Loads model + runtime once; a WebGPU failure falls back to the CPU set. */
function ensureWarm(): Promise<void> {
  if (warm) return warm;
  warm = (async () => {
    await measureDownload();
    try {
      await preload(config());
    } catch (error) {
      if (device === 'cpu') throw error;
      console.warn('WebGPU cutout failed, falling back to CPU', error);
      device = 'cpu';
      await measureDownload();
      await preload(config());
    }
  })();
  warm.catch(() => {
    warm = null;
  });
  return warm;
}

/** EXIF orientation applied where the browser supports the option; older Safari decodes without it. */
async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(file);
  }
}

async function decodeAndDownscale(file: Blob): Promise<ImageData> {
  const bitmap = await decode(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas is not available in the worker');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  } finally {
    bitmap.close();
  }
}

/** The mask as one byte per pixel. The library returns RGBA with the mask in the alpha channel. */
async function computeMask(image: ImageData): Promise<Uint8Array> {
  const input = new Blob([image.data], { type: `image/x-rgba8;width=${image.width};height=${image.height}` });
  const out = await segmentForeground(input, config());
  const rgba = new Uint8Array(await out.arrayBuffer());
  const count = image.width * image.height;
  if (rgba.length !== count * 4) throw new Error(`Unexpected mask size ${rgba.length} for ${count} pixels`);
  const mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) mask[i] = rgba[i * 4 + 3] ?? 0;
  return mask;
}

async function encode(image: ImageData, mask: Uint8Array): Promise<{ cutout: Blob; thumb: Blob }> {
  const data = new Uint8ClampedArray(image.data);
  for (let i = 0; i < mask.length; i++) data[i * 4 + 3] = mask[i] ?? 0;
  const full = new OffscreenCanvas(image.width, image.height);
  const ctx = full.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available in the worker');
  ctx.putImageData(new ImageData(data, image.width, image.height), 0, 0);
  const cutout = await full.convertToBlob({ type: 'image/png' });

  const scale = Math.min(1, THUMB_EDGE / Math.max(image.width, image.height));
  const small = new OffscreenCanvas(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  const sctx = small.getContext('2d');
  if (!sctx) throw new Error('2D canvas is not available in the worker');
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(full, 0, 0, small.width, small.height);
  const thumb = await small.convertToBlob({ type: 'image/png' });
  return { cutout, thumb };
}

async function cutout(id: number, file: Blob): Promise<CutoutResult> {
  const t0 = performance.now();
  activeId = id;
  const image = await decodeAndDownscale(file);
  await ensureWarm();
  const t1 = performance.now();
  scope.postMessage({ type: 'progress', id, progress: { phase: 'compute' } });
  const raw = await computeMask(image);
  const t2 = performance.now();
  // One cap, no speckles, solid inside, soft only at the edge — the photo underneath is untouched.
  const mask = cleanMask(raw, image.width, image.height);
  const stats = analyse(image, mask);
  const { cutout: png, thumb } = await encode(image, mask);
  const t3 = performance.now();
  return {
    cutout: png,
    thumb,
    stats,
    timing: { device, loadMs: Math.round(t1 - t0), inferMs: Math.round(t2 - t1), totalMs: Math.round(t3 - t0) },
  };
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

scope.onmessage = async (event) => {
  const request = event.data;
  if (request.type === 'preload') {
    try {
      activeId = null;
      await ensureWarm();
      scope.postMessage({ type: 'ready' });
    } catch (error) {
      scope.postMessage({ type: 'error', id: null, message: message(error) });
    }
    return;
  }
  try {
    const result = await cutout(request.id, request.file);
    scope.postMessage({ type: 'result', id: request.id, result });
  } catch (error) {
    scope.postMessage({ type: 'error', id: request.id, message: message(error) });
  }
};
