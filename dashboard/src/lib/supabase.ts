import { createClient } from '@supabase/supabase-js';

// We use environment variables to securely connect to Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
