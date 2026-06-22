import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// We only throw if it's not the build phase and vars are missing
if (!supabaseUrl || !supabaseKey) {
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
     console.warn('Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  }
}

export const supabaseAdmin = createClient(supabaseUrl || 'https://dummy.supabase.co', supabaseKey || 'dummy_key');
