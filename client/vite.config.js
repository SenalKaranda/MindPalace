import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: process.env.VITE_HOST || 'localhost',
    watch: {
      usePolling: true, // Required for Docker volume mounts
    },
    hmr: {
      host: process.env.VITE_HOST || 'localhost',
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

