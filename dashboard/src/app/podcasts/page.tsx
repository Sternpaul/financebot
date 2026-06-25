import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';
import PodcastClient from '@/components/PodcastClient';

export const dynamic = 'force-dynamic';

export default async function PodcastsPage() {
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
    .limit(50);

  return (
    <main className="page-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="header-title" style={{ margin: 0 }}>
            Every <span className="text-gradient">Macro Trade</span>, Tracked
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Every tradeable thesis ever mentioned on your favorite macro shows.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {error ? (
          <div className="glass-panel">
            <p style={{ color: 'var(--trend-down)' }}>Failed to load podcasts: {error.message}</p>
          </div>
        ) : !episodes || episodes.length === 0 ? (
          <div className="glass-panel">
            <p style={{ color: 'var(--text-secondary)' }}>No podcast episodes found. Waiting for background sync.</p>
          </div>
        ) : (
          <PodcastClient initialEpisodes={episodes} />
        )}
      </div>
    </main>
  );
}
