import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function TickerDashboard({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();
  const FINNHUB_KEY = process.env.FINNHUB_API_KEY;

  // 1. Fetch Quote
  let quote = null;
  let profile = null;
  if (FINNHUB_KEY) {
    const qRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`, { next: { revalidate: 60 } });
    if (qRes.ok) quote = await qRes.json();

    const pRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${FINNHUB_KEY}`, { next: { revalidate: 86400 } });
    if (pRes.ok) profile = await pRes.json();
  }

  // 2. Fetch News from our Supabase DB
  const { data: news } = await supabase
    .from('news_articles')
    .select('*')
    .or(`source_handle.eq.${ticker},tickers_mentioned.cs.{${ticker}}`)
    .order('posted_at', { ascending: false })
    .limit(10);

  return (
    <main className="page-container animate-fade-in">
      <Link href="/watchlist" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Watchlist
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--foreground)' }}>{ticker}</h1>
          {profile?.name && <h2 style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 'normal' }}>{profile.name}</h2>}
        </div>
        {quote && quote.c && (
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--foreground)' }}>${quote.c.toFixed(2)}</h1>
            <h3 style={{ margin: 0, color: quote.d >= 0 ? '#4caf50' : '#ff3366' }}>
              {quote.d > 0 ? '+' : ''}{quote.d.toFixed(2)} ({quote.dp.toFixed(2)}%)
            </h3>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Interactive TradingView Chart Component (Coming Soon)</p>
          </div>

          <div className="glass-panel">
            <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--glass-border)', paddingBottom: '10px', color: 'var(--foreground)' }}>Latest Bot Intelligence</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              {news?.map(article => (
                <div key={article.id} style={{ padding: '15px', background: 'var(--background)', borderRadius: '8px', border: '1px solid #333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>{article.source_platform}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(article.posted_at).toLocaleString()}</span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--foreground)' }}>{article.title}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{article.content.substring(0, 150)}...</p>
                  {article.url && <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '10px', color: 'var(--accent)', fontSize: '0.9rem' }}>Read Original →</a>}
                </div>
              ))}
              {(!news || news.length === 0) && <p style={{ color: 'var(--text-secondary)' }}>No automated news collected yet.</p>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel">
            <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Company Profile</h3>
            {profile ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <p><strong>Industry:</strong> {profile.finnhubIndustry}</p>
                <p><strong>Exchange:</strong> {profile.exchange}</p>
                <p><strong>IPO:</strong> {profile.ipo}</p>
                <p><strong>Market Cap:</strong> ${(profile.marketCapitalization || 0).toLocaleString()}M</p>
                {profile.weburl && <a href={profile.weburl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Website</a>}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Profile not available.</p>
            )}
          </div>
          
          <div className="glass-panel">
            <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Active Alerts</h3>
            <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid #ff3366', padding: '10px', borderRadius: '8px', color: '#ff3366', fontSize: '0.9rem' }}>
              Price Drop Alert: -5.0%
            </div>
            <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50', padding: '10px', borderRadius: '8px', color: '#4caf50', fontSize: '0.9rem', marginTop: '10px' }}>
              News Sentiment Alert: Active
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
