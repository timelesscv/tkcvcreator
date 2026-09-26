import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || env.VITE_API_KEY || env.API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kzzpurqsyrsjwpmphbrm.supabase.co';
  const supabaseKey = env.VITE_SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6enB1cnFzeXJzandwbXBoYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTM1NTksImV4cCI6MjA4MTI4OTU1OX0.fwfUw8DaEMtr-7cng5Bwd_H6EqfiDGpidCFEU7Rcyg8';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.API_KEY': JSON.stringify(geminiKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_KEY': JSON.stringify(supabaseKey),
      'process.env': 'globalThis.process.env'
    },
    optimizeDeps: {
      include: ['@google/genai']
    }
  };
});
