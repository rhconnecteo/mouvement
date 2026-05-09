import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = "https://script.google.com/macros/s/AKfycby89NGDbKuvclBFZCFMGNaKZSI6MMajmmKwwr-CTiDKgA42bYkmk5c5KVOlLYIwBx0/exec";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/apps-script': {
        target: appsScriptTarget,
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/apps-script/, '')
      }
    }
  }
});
