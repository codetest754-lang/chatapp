import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api/auth': {
        target: 'http://auth-service:8080',
        changeOrigin: true
      },
      '/api/chat': {
        target: 'http://chat-service:8080',
        changeOrigin: true
      },
      '/api/users': {
        target: 'http://user-service:8080',
        changeOrigin: true
      },
      '/api/media': {
        target: 'http://media-service:8080',
        changeOrigin: true
      },
      '/hubs': {
        target: 'http://chat-service:8080',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
