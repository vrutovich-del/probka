import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // The cutout worker code-splits the ONNX runtime with dynamic imports, which needs a module worker.
  worker: { format: 'es' },
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 4173, strictPort: true },
});
