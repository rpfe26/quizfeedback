import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3050',
        changeOrigin: true
      }
    }
  }
});
