import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
});
