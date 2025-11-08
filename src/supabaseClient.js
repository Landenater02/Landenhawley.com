import { createClient } from '@supabase/supabase-js';

// Configure these in your environment. For Create React App use variables prefixed with REACT_APP_
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://fgjfjbxmiqxrcfxomjkj.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_6xQ7G6pWO6sFY8zi-fMTlQ_s_juCch8';

if (!supabaseUrl || !supabaseAnonKey) {
  // It's fine to run locally with env vars; warn when missing so developer can configure.
  // Do NOT commit a service_role (secret) key here.
  // Example (PowerShell): $env:REACT_APP_SUPABASE_URL = 'https://xyz.supabase.co'; $env:REACT_APP_SUPABASE_ANON_KEY = 'your-anon-key'
  console.warn('REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY is not set. Supabase client will not work until these are configured.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
