'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function fetchTranscript(videoId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('podcast_transcripts')
    .select('transcript_text')
    .eq('video_id', videoId)
    .single();

  if (error || !data) {
    return null;
  }
  
  return data.transcript_text;
}
