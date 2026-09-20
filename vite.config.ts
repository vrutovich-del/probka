import { copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Static hosts answer an unknown path with 404.html, so a copy of the app there keeps deep links
 * like /garage/cap/<id> working. .nojekyll stops GitHub Pages from dropping files that start with _.
 * Runs after the PWA plugin so the copy carries the service-worker registration too.
 */
function staticHostFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'cap-garage:static-host-fallback',
    apply: 'build',
    enforce: 'post',
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
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // "Cap Garage" is the product's name, not copy: it reads the same in all three languages,
        // like the language endonyms. A manifest holds one language and this is it.
        name: 'Cap Garage',
        short_name: 'Cap Garage',
        description: 'A bottle-cap collection for one young collector.',
        lang: 'en',
        dir: 'ltr',
        start_url: '.',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0B0B0B',
        theme_color: '#0B0B0B',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The shell: code, styles, fonts, icons, badge art and the sample photos. Two things are left
        // out on purpose. `.wasm`, because Vite copies onnxruntime's 24 MB jsep build into the bundle
        // although the app takes its runtime from /cutout/. And the ONNX runtime chunks, because a
        // phone loads either the plain or the WebGPU build, never both — they are cached at runtime
        // instead, which halves the install and reaches the same place after the first cutout.
        globPatterns: ['**/*.{js,mjs,css,html,woff2,webp,png,svg,ico}'],
        globIgnores: ['**/*.wasm', 'assets/ort*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // The API, wherever it is served from. Never cached: a stale answer about an account,
            // a friend or a sync queue is worse than no answer, and the app is built to cope with
            // being offline anyway. Cross-origin requests already fall through to the network —
            // this states it, so a later rule cannot swallow them by accident.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            // Model weights and the wasm runtime: content-addressed names, ~56 MB (CPU) or ~111 MB
            // (WebGPU) per phone, downloaded once. Cache first, so a cap can be cut out with no network.
            urlPattern: ({ url }) => url.pathname.includes('/cutout/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'cutout-model',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // The ONNX runtime's own chunks, left out of the precache above. The worker loads
            // ort(.webgpu).bundle.min-*.js, which in turn loads the .mjs beside it — both are needed
            // offline, and both are content-addressed, so cache first is safe.
            urlPattern: ({ url }) => /\/assets\/ort[\w.-]*\.m?js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'cutout-runtime',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    staticHostFallback(),
  ],
  // The cutout worker code-splits the ONNX runtime with dynamic imports, which needs a module worker.
  worker: { format: 'es' },
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
});
