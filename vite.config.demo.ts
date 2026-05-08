import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Standalone demo build — produces a single-page artifact at
 * `dist-demo/` with no Cult product surface, no Supabase client in
 * the initial bundle, no auth, no router. Mounts only the
 * LabProductionPlanner via `index-demo.html` → `src/demo/main.tsx`.
 *
 * Deploy target: a separate Vercel project pointing at this repo
 * with build command `npm run build:demo` and output directory
 * `dist-demo`. URL becomes the prospect-facing interactive artifact
 * (no env vars required, no auth gate).
 *
 * The standard `vite.config.ts` is unchanged — `npm run build`
 * still produces the full Cult app at `dist/` for the existing
 * Vercel project.
 */
export default defineConfig({
  plugins: [react()],
  publicDir: 'public-demo',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@types': path.resolve(__dirname, './src/types'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@services': path.resolve(__dirname, './src/services'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist-demo',
    rollupOptions: {
      input: path.resolve(__dirname, 'index-demo.html'),
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler')) return 'vendor-react';
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
});
