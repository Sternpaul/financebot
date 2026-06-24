import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';

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
          episodes.map((episode) => {
            const dateStr = new Date(episode.published_at).toLocaleDateString(undefined, { 
              month: 'short', day: 'numeric', year: 'numeric' 
            });
            const daysAgo = Math.floor((Date.now() - new Date(episode.published_at).getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={episode.id} className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '50%', 
                      background: 'linear-gradient(135deg, var(--bg-modifier-hover), var(--bg-modifier-active))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)'
                    }}>
                      {episode.show_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                        @{episode.show_name.replace(/\s+/g, '')}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#ff0000' }}>▶</span>
                        {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`} • {dateStr}
                      </div>
                    </div>
                  </div>
                  <a href={`https://youtube.com/watch?v=${episode.video_id}`} target="_blank" rel="noopener noreferrer" style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'var(--bg-modifier-hover)',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                  </a>
                </div>

                <h2 style={{ fontSize: '1.3rem', fontWeight: '500', marginBottom: '20px', color: 'var(--text-primary)' }}>
                  {episode.title}
                </h2>

                <div style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '12px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px' }}>
                  IDEAS · {episode.podcast_trades ? episode.podcast_trades.length : 0}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {!episode.podcast_trades || episode.podcast_trades.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No specific trades identified in this episode.</p>
                  ) : (
                    episode.podcast_trades.map((trade: any) => {
                      const isLong = trade.trade_type === 'LONG';
                      const isShort = trade.trade_type === 'SHORT';
                      
                      return (
                        <div key={trade.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '12px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}>
                          <div style={{ 
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: 'var(--bg-modifier-hover)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 'bold'
                          }}>
                            {trade.ticker.substring(0, 1)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>{trade.ticker}</span>
                              <span style={{
                                fontSize: '0.7rem', fontWeight: '600', padding: '2px 8px', borderRadius: '12px',
                                background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8'
                              }}>
                                ai extracted
                              </span>
                              <span style={{
                                fontSize: '0.8rem', fontWeight: '700',
                                color: isLong ? 'var(--trend-up)' : isShort ? 'var(--trend-down)' : 'var(--text-secondary)'
                              }}>
                                {trade.trade_type}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                              {trade.thesis}
                            </p>
                            {trade.speaker && (
                              <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                — {trade.speaker}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
