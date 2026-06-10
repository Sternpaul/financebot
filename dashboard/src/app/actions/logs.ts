'use server';

import { supabase } from '@/lib/supabase';

export async function fetchIngestionLogs(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('ingestion_logs')
      .select('id, timestamp, source_platform, source_handle, status, message')
      .order('timestamp', { ascending: false })
      .limit(limit);

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
