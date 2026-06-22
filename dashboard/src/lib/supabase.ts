import { createClient } from '@supabase/supabase-js';

// We use environment variables to securely connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
// Use the Service Role Key on the server side to securely bypass RLS without exposing secrets to the browser.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
