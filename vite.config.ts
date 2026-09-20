import { copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Static hosts answer an unknown path with 404.html, so a copy of the app there keeps deep links
 * like /garage/cap/<id> working. .nojekyll stops GitHub Pages from dropping files that start with _.
 */
function staticHostFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'cap-garage:static-host-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      copyFileSync(path.join(outDir, 'index.html'), path.join(outDir, '404.html'));
      writeFileSync(path.join(outDir, '.nojekyll'), '');
    },
  };
}

export default defineConfig({
  // GitHub Pages serves the app from /probka/; the deploy workflow sets BASE_PATH, local builds stay at the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), staticHostFallback()],
  // The cutout worker code-splits the ONNX runtime with dynamic imports, which needs a module worker.
  worker: { format: 'es' },
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
});
