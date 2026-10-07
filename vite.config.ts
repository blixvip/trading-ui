import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Demo / showcase app. `vite.lib.config.ts` builds the distributable. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 4310, open: false },
  build: { outDir: 'dist-demo' },
});
