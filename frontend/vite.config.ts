import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  define: { __OFFLINE_DEMO__: JSON.stringify(mode === 'demo') },
  build: mode === 'demo' ? { outDir: 'demo-dist' } : undefined,
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } },
  },
}));
