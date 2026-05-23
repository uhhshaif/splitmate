import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// A simple helper to check if we are in mock mode (i.e. no Supabase details provided)
export const isMockMode = !supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_project_url' || supabaseAnonKey === 'your_anon_key';

// Initialize the client. If in mock mode, create a client with dummy values to avoid crashes on startup
export const supabase = createClient(
  isMockMode ? 'https://dummy-project.supabase.co' : supabaseUrl,
  isMockMode ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy' : supabaseAnonKey
);

if (isMockMode) {
  console.warn(
    'Splitmate: running in Mock Mode (offline local storage) because NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured in .env.local'
  );
}

