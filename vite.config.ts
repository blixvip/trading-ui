import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Declared rather than pulling in @types/node for one env var, the same way
// test/smoke.tsx declares the bit of `process` it uses.
declare const process: { env: Record<string, string | undefined> };

/**
 * Demo / showcase app. `vite.lib.config.ts` builds the distributable.
 *
 * `base` is set only for the Pages build: the site is served from a project
 * subpath there (`/trading-ui/`) but from the root in dev and in any other
 * deploy, and a hard-coded base breaks whichever one it is not written for.
 */
export default defineConfig({
  base: process.env.SITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: { port: 4310, open: false },
  build: { outDir: 'dist-site' },
});
