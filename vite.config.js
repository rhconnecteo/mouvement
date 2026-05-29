import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = "https://script.google.com/macros/s/AKfycbxdrleTZj9mFufcRCAwfJxzAyRRktE2lSbXmyQW6-vW754BnyQBNWRL5xApFO96QOYO/exec";

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
