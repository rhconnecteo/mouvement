import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = "https://script.google.com/macros/s/AKfycbycBJSIQzLL-O9ZuBibwJ2pL1uKPk3KI7r4OUvRsJzqcpCN00HYS24p1xQSpNAQkoF9/exec";

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
