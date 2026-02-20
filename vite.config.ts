import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/pdfjs-dist')) return 'vendor-pdfjs';
          if (id.includes('node_modules/jspdf')) return 'vendor-jspdf';
          if (id.includes('node_modules/html2canvas')) return 'vendor-html2canvas';
          if (id.includes('node_modules/leaflet')) return 'vendor-leaflet';
          if (id.includes('node_modules/@supabase')) return 'vendor-supabase';
          if (id.includes('node_modules/react-dom')) return 'vendor-react-dom';
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide';
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
});
