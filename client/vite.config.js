import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    // Use 'true' to bind to all network interfaces (0.0.0.0)
    // This allows access via both localhost:3001 and 127.0.0.1:3001
    // Set VITE_HOST=localhost in .env if you want to restrict to localhost only
    host: process.env.VITE_HOST || true,
    watch: {
      usePolling: true, // Required for Docker volume mounts
    },
    hmr: {
      // HMR will work with the server host setting
      // If accessing via 127.0.0.1, HMR will use that automatically
      port: 3001,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['recharts'],
          'vendor-calendar': ['react-big-calendar', 'moment'],
          'vendor-grid': ['react-grid-layout', 'react-rnd'],
          'vendor-utils': ['axios', 'react-markdown', 'geopattern'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
    ],
  },
});

