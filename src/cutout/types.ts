/** Pixel rectangle inside an image. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type CutoutDevice = 'cpu' | 'gpu';

export interface CutoutStats {
  /** Working size the mask was computed at (the photo downscaled to ≤1024 on its long edge). */
  width: number;
  height: number;
  /** Where the cap is, in working pixels. */
  bbox: Box;
  /** Share of pixels the mask keeps; near 0 or 1 means the model found nothing usable. */
  opaqueFraction: number;
  /** Average colour of the cap's outer rim, `#rrggbb` — the 3D side when there is no side photo. */
  rimColor: string;
}

export interface CutoutTiming {
  device: CutoutDevice;
  /** Model download + session start, 0 once warm. */
  loadMs: number;
  inferMs: number;
  totalMs: number;
}

export interface CutoutResult {
  /** PNG, RGB identical to the downscaled photo, alpha from the mask. */
  cutout: Blob;
  /** PNG ≤256px for grids and cards. */
  thumb: Blob;
  stats: CutoutStats;
  /** null when nothing was run: the bundled sample arrives already cut out. */
  timing: CutoutTiming | null;
}

export type CutoutProgress =
  | { phase: 'download'; loaded: number; total: number }
  | { phase: 'compute' };

export type WorkerRequest = { type: 'preload' } | { type: 'cutout'; id: number; file: Blob };

export type WorkerResponse =
  | { type: 'progress'; id: number | null; progress: CutoutProgress }
  | { type: 'ready' }
  | { type: 'result'; id: number; result: CutoutResult }
  | { type: 'error'; id: number | null; message: string };
