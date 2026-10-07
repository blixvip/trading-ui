import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Library build.
 *
 * React and every Radix primitive stay external so a consumer app ships one
 * copy of each - bundling Radix here would mean two context instances and
 * portals that do not see each other. Types come from
 * `tsc --emitDeclarationOnly` (see `build:types`).
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      // Relative to the Vite root, which keeps this config free of node APIs.
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: (id) =>
        id === 'react' ||
        id === 'react-dom' ||
        id.startsWith('react/') ||
        id.startsWith('react-dom/') ||
        id.startsWith('@radix-ui/') ||
        id === 'lucide-react' ||
        id === 'clsx' ||
        id === 'tailwind-merge' ||
        id === 'class-variance-authority',
      output: { assetFileNames: 'styles.css' },
    },
  },
});
