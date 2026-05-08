import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appsScriptTarget = 'https://script.google.com/macros/s/AKfycbzzEbuBn4FPRPCtvZpic8xdjBeZW3KkqqQ2LDBJFZOL6I37IzEjcP-8at6ahETEESY/exec';

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
