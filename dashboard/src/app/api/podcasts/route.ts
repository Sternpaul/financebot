import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authError = await requireAuth();
    if (authError) return authError;

    // Fetch the recent episodes and their associated trades
    const { data: episodes, error } = await supabaseAdmin
      .from('podcast_episodes')
      .select(`
        id,
        show_name,
        title,
        video_id,
        published_at,
        podcast_trades (
          id,
          ticker,
          trade_type,
          thesis,
          speaker,
          quote
        )
      `)
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching podcasts:', error);
      return NextResponse.json({ error: 'Failed to fetch podcasts' }, { status: 500 });
    }

    return NextResponse.json(episodes);
  } catch (error) {
    console.error('API /api/podcasts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
