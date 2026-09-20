import type { CutoutProgress, CutoutResult, WorkerRequest, WorkerResponse } from './types';

/**
 * Main-thread side of the cutout worker. One worker for the app's lifetime keeps the model session warm,
 * so the second cap skips the load. Requests are answered one at a time, in order.
 */
interface Pending {
  resolve: (result: CutoutResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: CutoutProgress) => void;
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
const preloadListeners = new Set<(progress: CutoutProgress) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const msg = event.data;
    switch (msg.type) {
      case 'progress': {
        const target = msg.id === null ? null : pending.get(msg.id);
        if (target?.onProgress) target.onProgress(msg.progress);
        else for (const fn of preloadListeners) fn(msg.progress);
        // A download started by preload keeps reporting under id null; forward it to whoever waits now.
        if (msg.id === null) for (const p of pending.values()) p.onProgress?.(msg.progress);
        break;
      }
      case 'ready':
        break;
      case 'result':
        pending.get(msg.id)?.resolve(msg.result);
        pending.delete(msg.id);
        break;
      case 'error':
        if (msg.id === null) {
          console.error('Cutout preload failed:', msg.message);
        } else {
          pending.get(msg.id)?.reject(new Error(msg.message));
          pending.delete(msg.id);
        }
        break;
    }
  };
  worker.onerror = (event) => {
    console.error('Cutout worker crashed', event.message);
    for (const p of pending.values()) p.reject(new Error(event.message || 'Cutout worker crashed'));
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

function post(request: WorkerRequest): void {
  getWorker().postMessage(request);
}

/**
 * Starts downloading model and runtime (once) so they are ready by the time the photo is taken.
 * Offline it waits: the service worker serves the files from its cache once they have been fetched,
 * and asking before there is a network only produces a failure to log.
 */
export function preloadCutout(onProgress?: (progress: CutoutProgress) => void): () => void {
  if (onProgress) preloadListeners.add(onProgress);
  const start = () => post({ type: 'preload' });
  if (navigator.onLine) start();
  else window.addEventListener('online', start, { once: true });
  return () => {
    window.removeEventListener('online', start);
    if (onProgress) preloadListeners.delete(onProgress);
  };
}

export function runCutout(file: Blob, onProgress?: (progress: CutoutProgress) => void): Promise<CutoutResult> {
  const id = nextId++;
  return new Promise<CutoutResult>((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    post({ type: 'cutout', id, file });
  });
}
