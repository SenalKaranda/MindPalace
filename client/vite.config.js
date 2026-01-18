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
});

