#!/usr/bin/env node
// Mirrors the background-removal model and ONNX runtime files into public/cutout/ so the app serves them
// from its own origin and never contacts IMG.LY at runtime.
//
//   node scripts/fetch-cutout-model.mjs
//
// public/cutout/ is not in git (≈170 MB); run this once after `npm install` and on every deploy.
// Files are the CDN's own chunks, verified by SHA-256, plus a resources.json trimmed to what the app uses:
//   CPU phones      → isnet_quint8 (44 MB) + ort-wasm-simd-threaded (12 MB)
//   WebGPU phones   → isnet_fp16 (88 MB)   + ort-wasm-simd-threaded.jsep (23 MB)

import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/@imgly/background-removal/package.json'), 'utf8'));
const CDN = `https://staticimgly.com/@imgly/background-removal-data/${pkg.version}/dist/`;
const OUT = path.join(root, 'public/cutout');
const KEYS = [
  '/models/isnet_quint8',
  '/models/isnet_fp16',
  '/onnxruntime-web/ort-wasm-simd-threaded.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.mjs',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm',
  '/onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs',
];
const CONCURRENCY = 4;

await mkdir(OUT, { recursive: true });

const response = await fetch(new URL('resources.json', CDN));
if (!response.ok) throw new Error(`resources.json: HTTP ${response.status}`);
const all = await response.json();

const resources = {};
const jobs = [];
for (const key of KEYS) {
  const entry = all[key];
  if (!entry) throw new Error(`${key} is not in the CDN's resources.json`);
  resources[key] = entry;
  for (const chunk of entry.chunks) jobs.push({ key, chunk });
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function haveChunk(chunk) {
  const file = path.join(OUT, chunk.name);
  const size = chunk.offsets[1] - chunk.offsets[0];
  try {
    if ((await stat(file)).size !== size) return false;
    return sha256(await readFile(file)) === chunk.hash;
  } catch {
    return false;
  }
}

let done = 0;
let downloaded = 0;
async function fetchChunk({ key, chunk }) {
  if (await haveChunk(chunk)) {
    done += 1;
    return;
  }
  const res = await fetch(new URL(chunk.name, CDN));
  if (!res.ok) throw new Error(`${chunk.name}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha256(buf) !== chunk.hash) throw new Error(`${chunk.name}: SHA-256 mismatch`);
  await writeFile(path.join(OUT, chunk.name), buf);
  done += 1;
  downloaded += buf.length;
  process.stdout.write(`  ${done}/${jobs.length}  ${key}  ${(buf.length / 1e6).toFixed(1)} MB\n`);
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) await fetchChunk(job);
  }),
);

await writeFile(path.join(OUT, 'resources.json'), JSON.stringify(resources, null, 2) + '\n');
const total = KEYS.reduce((n, k) => n + resources[k].size, 0);
console.log(
  `public/cutout: ${jobs.length} chunks, ${(total / 1e6).toFixed(0)} MB on disk, ${(downloaded / 1e6).toFixed(0)} MB downloaded now`,
);
