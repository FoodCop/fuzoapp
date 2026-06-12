import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      base: '/',
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;

              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }

              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }

              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }

              if (id.includes('@googlemaps')) {
                return 'vendor-maps';
              }

              if (id.includes('@google/genai')) {
                return 'vendor-ai';
              }

              return 'vendor-core';
            },
          },
        },
      },
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {},
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
