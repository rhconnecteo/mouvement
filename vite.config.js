import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = "https://script.google.com/macros/s/AKfycbwxGVKhdvnNezbA-CEoIR3DSnvItwFDjDw8Wb3BVj3rIieoHP8aoK-rJtTurYHpjurr/exec";

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
