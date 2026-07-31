import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/botapi": {
        target: "http://127.0.0.1:5001",
        changeOrigin: true,
      },
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/web_images": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  
  // ✅ ДОБАВЬ ЭТО
  build: {
    // `dist` is the symlink to the active combined production release.
    // Keep standalone Vite builds isolated; deploy.sh overrides this path
    // with its release-specific legacy directory.
    outDir: ".dist-vite-local",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Radix UI components
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          
          // Date libraries
          if (id.includes('date-fns')) {
            return 'date-vendor';
          }
          
          // Admin components (тяжелые формы)
          if (
            id.includes('/src/components/admin/') ||
            id.includes('/src/components/CarForm') ||
            id.includes('/src/components/BookingForm')
          ) {
            return 'admin';
          }
          
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
  },
}));
