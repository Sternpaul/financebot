'use server';

import { query } from '@/lib/db';

export async function fetchIngestionLogs(limit = 100) {
  try {
    const result = await query(
      `SELECT id, timestamp, source_platform, source_handle, status, message 
       FROM ingestion_logs 
       ORDER BY timestamp DESC 
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching ingestion logs:', error);
    return [];
  }
}
