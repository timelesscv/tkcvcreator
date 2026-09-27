import { createClient } from '@supabase/supabase-js';

// Access Supabase credentials with robust fallbacks across Vite, Vercel, and browser shims
const supabaseUrl = 
  (import.meta as any)?.env?.VITE_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  (window as any)?.process?.env?.SUPABASE_URL || 
  'https://kzzpurqsyrsjwpmphbrm.supabase.co';

const supabaseAnonKey = 
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || 
  (import.meta as any)?.env?.VITE_SUPABASE_KEY || 
  process.env.SUPABASE_KEY || 
  (window as any)?.process?.env?.SUPABASE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6enB1cnFzeXJzandwbXBoYnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MTM1NTksImV4cCI6MjA4MTI4OTU1OX0.fwfUw8DaEMtr-7cng5Bwd_H6EqfiDGpidCFEU7Rcyg8';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase Client] Supabase URL or Anon Key is missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
