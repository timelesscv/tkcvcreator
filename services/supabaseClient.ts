
import { createClient } from '@supabase/supabase-js';

// Access keys from the global process shim defined in index.html
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase configuration missing in process.env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
