// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: "stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      "@types": path.resolve(__vite_injected_original_dirname, "./src/types"),
      "@features": path.resolve(__vite_injected_original_dirname, "./src/features"),
      "@lib": path.resolve(__vite_injected_original_dirname, "./src/lib"),
      "@shared": path.resolve(__vite_injected_original_dirname, "./src/shared"),
      "@services": path.resolve(__vite_injected_original_dirname, "./src/services"),
      "@pages": path.resolve(__vite_injected_original_dirname, "./src/pages")
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/pdfjs-dist")) return "vendor-pdfjs";
          if (id.includes("node_modules/jspdf")) return "vendor-jspdf";
          if (id.includes("node_modules/html2canvas")) return "vendor-html2canvas";
          if (id.includes("node_modules/leaflet")) return "vendor-leaflet";
          if (id.includes("node_modules/@supabase")) return "vendor-supabase";
          if (id.includes("node_modules/react-dom")) return "vendor-react-dom";
          if (id.includes("node_modules/react-router-dom") || id.includes("node_modules/react-router")) return "vendor-router";
          if (id.includes("node_modules/lucide-react")) return "vendor-lucide";
          if (id.includes("node_modules/")) return "vendor-misc";
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgdmlzdWFsaXplcih7XG4gICAgICBmaWxlbmFtZTogJ3N0YXRzLmh0bWwnLFxuICAgICAgb3BlbjogZmFsc2UsXG4gICAgICBnemlwU2l6ZTogdHJ1ZSxcbiAgICAgIGJyb3RsaVNpemU6IHRydWUsXG4gICAgfSksXG4gIF0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICdAdHlwZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvdHlwZXMnKSxcbiAgICAgICdAZmVhdHVyZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvZmVhdHVyZXMnKSxcbiAgICAgICdAbGliJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2xpYicpLFxuICAgICAgJ0BzaGFyZWQnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvc2hhcmVkJyksXG4gICAgICAnQHNlcnZpY2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3NlcnZpY2VzJyksXG4gICAgICAnQHBhZ2VzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3BhZ2VzJyksXG4gICAgfSxcbiAgfSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiAoaWQpID0+IHtcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9wZGZqcy1kaXN0JykpIHJldHVybiAndmVuZG9yLXBkZmpzJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9qc3BkZicpKSByZXR1cm4gJ3ZlbmRvci1qc3BkZic7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvaHRtbDJjYW52YXMnKSkgcmV0dXJuICd2ZW5kb3ItaHRtbDJjYW52YXMnO1xuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2xlYWZsZXQnKSkgcmV0dXJuICd2ZW5kb3ItbGVhZmxldCc7XG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHN1cGFiYXNlJykpIHJldHVybiAndmVuZG9yLXN1cGFiYXNlJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1kb20nKSkgcmV0dXJuICd2ZW5kb3ItcmVhY3QtZG9tJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXItZG9tJykgfHwgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1yb3V0ZXInKSkgcmV0dXJuICd2ZW5kb3Itcm91dGVyJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9sdWNpZGUtcmVhY3QnKSkgcmV0dXJuICd2ZW5kb3ItbHVjaWRlJztcbiAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy8nKSkgcmV0dXJuICd2ZW5kb3ItbWlzYyc7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGtCQUFrQjtBQUgzQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixXQUFXO0FBQUEsTUFDVCxVQUFVO0FBQUEsTUFDVixNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixZQUFZO0FBQUEsSUFDZCxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3BDLFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxNQUMvQyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxnQkFBZ0I7QUFBQSxNQUNyRCxRQUFRLEtBQUssUUFBUSxrQ0FBVyxXQUFXO0FBQUEsTUFDM0MsV0FBVyxLQUFLLFFBQVEsa0NBQVcsY0FBYztBQUFBLE1BQ2pELGFBQWEsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQjtBQUFBLE1BQ3JELFVBQVUsS0FBSyxRQUFRLGtDQUFXLGFBQWE7QUFBQSxJQUNqRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxjQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLGNBQWMsQ0FBQyxPQUFPO0FBQ3BCLGNBQUksR0FBRyxTQUFTLHlCQUF5QixFQUFHLFFBQU87QUFDbkQsY0FBSSxHQUFHLFNBQVMsb0JBQW9CLEVBQUcsUUFBTztBQUM5QyxjQUFJLEdBQUcsU0FBUywwQkFBMEIsRUFBRyxRQUFPO0FBQ3BELGNBQUksR0FBRyxTQUFTLHNCQUFzQixFQUFHLFFBQU87QUFDaEQsY0FBSSxHQUFHLFNBQVMsd0JBQXdCLEVBQUcsUUFBTztBQUNsRCxjQUFJLEdBQUcsU0FBUyx3QkFBd0IsRUFBRyxRQUFPO0FBQ2xELGNBQUksR0FBRyxTQUFTLCtCQUErQixLQUFLLEdBQUcsU0FBUywyQkFBMkIsRUFBRyxRQUFPO0FBQ3JHLGNBQUksR0FBRyxTQUFTLDJCQUEyQixFQUFHLFFBQU87QUFDckQsY0FBSSxHQUFHLFNBQVMsZUFBZSxFQUFHLFFBQU87QUFBQSxRQUMzQztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
