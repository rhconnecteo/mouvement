import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = 'https://script.google.com/macros/s/AKfycbxyyu02CzO1noH9C_josMSrNSEyrQJJiXwA2A8bAGCrNcwgbxv7ruP8cWvBsNmzkkWe/exec';

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
