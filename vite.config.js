import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = "https://script.google.com/macros/s/AKfycbwwKFVC_l4kKE8uZ9MU1CpUhCVICxoUZRyXX6OPmPE_2XI3TTzzPKByUmxp8Etsdt8Y/exec";

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
