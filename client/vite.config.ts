import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          // Silencia erros normais de desconexão abrupta (EPIPE / ECONNRESET)
          // quando celulares bloqueiam a tela, dão F5 ou fecham a aba
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (
              err.code === 'EPIPE' ||
              err.code === 'ECONNRESET' ||
              err.code === 'ECONNREFUSED'
            ) {
              return;
            }
            console.error('[proxy error]', err.message);
          });

          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err: NodeJS.ErrnoException) => {
              if (err.code === 'EPIPE' || err.code === 'ECONNRESET') {
                return;
              }
            });
          });
        },
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
