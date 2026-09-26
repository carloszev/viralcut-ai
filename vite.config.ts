import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    watch: {
      ignored: [
        '**/exports/**',
        '**/uploads/**',
        '**/data/**',
        '**/.git/**',
        '**/node_modules/**',
        '**/*.tmp*',
        '**/*.mp4',
        '**/*.webm',
        '**/*.part'
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/exports': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
