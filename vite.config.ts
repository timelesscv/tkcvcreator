
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'process';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      // Point all process.env calls to the global window shim
      'process.env': 'globalThis.process.env'
    },
    optimizeDeps: {
      include: ['@google/genai']
    }
  };
});
