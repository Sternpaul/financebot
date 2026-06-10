'use server';

import { supabase } from '@/lib/supabase';

export async function fetchIngestionLogs(limit = 100, platform: 'raw' | 'ai' = 'raw') {
  try {
    let query = supabase
      .from('ingestion_logs')
      .select('id, timestamp, source_platform, source_handle, status, message')
      .order('timestamp', { ascending: false })
      .limit(limit);
      
    if (platform === 'ai') {
        query = query.eq('source_platform', 'ai_brain');
    } else {
        query = query.neq('source_platform', 'ai_brain');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ingestion logs from Supabase:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching ingestion logs:', error);
    return [];
  }
}
