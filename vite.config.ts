import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-livekit': ['@livekit/components-react', 'livekit-client'],
              'vendor-pdf': ['react-pdf', 'pdfjs-dist'],
              'vendor-charts': ['recharts'],
              'vendor-firebase': [
                'firebase/app', 'firebase/auth', 'firebase/firestore', 
                'firebase/functions', 'firebase/storage'
              ],
            }
          }
        }
      }
    };
});
