import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { cookies } from 'next/headers';

export default async function TickerDashboard({ params }: { params: Promise<{ ticker: string }> }) {
  const resolvedParams = await params;
  const rawTicker = resolvedParams.ticker.toUpperCase();
  const ticker = decodeURIComponent(rawTicker);

  // 1. Fetch Quote from Yahoo Finance (Safe, no API key needed)
  let quote = null;
  try {
    const qRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`, { next: { revalidate: 60 } });
    if (qRes.ok) {
        const data = await qRes.json();
        if (data.quoteResponse?.result?.length > 0) {
            quote = data.quoteResponse.result[0];
        }
    }
  } catch(e) {
      console.error(e);
  }

  // Handle Global Currency Context
  const cookieStore = await cookies();
  const currencyCookie = cookieStore.get('app-currency')?.value || 'USD';
  const isEur = currencyCookie === 'EUR';
  const currencySymbol = isEur ? '€' : '$';
  const exchangeRate = isEur ? 0.92 : 1.0;

  // 2. Fetch News from our Supabase DB
  let news = [];
  try {
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .or(`source_handle.eq.${ticker},tickers_mentioned.cs.{${ticker}}`)
      .order('posted_at', { ascending: false })
      .limit(10);
    if (data) news = data;
  } catch(e) {
      console.error(e);
  }

  const price = quote?.regularMarketPrice || 0;
  const change = quote?.regularMarketChange || 0;
  const changePct = quote?.regularMarketChangePercent || 0;
  const isPositive = change >= 0;

  return (
    <main className="page-container animate-fade-in">
      <Link href="/watchlist" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Watchlist
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--foreground)' }}>{ticker}</h1>
          {quote?.longName && <h2 style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 'normal' }}>{quote.longName}</h2>}
        </div>
        {quote && (
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '3rem', color: 'var(--foreground)' }}>
              {currencySymbol}{(price * exchangeRate).toFixed(2)}
            </h1>
            <h3 style={{ margin: 0, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
              {isPositive ? '+' : ''}{(change * exchangeRate).toFixed(2)} ({changePct.toFixed(2)}%)
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
                <div key={article.id} style={{ padding: '15px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong>{article.source_platform}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(article.posted_at).toLocaleString()}</span>
                  </div>
                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--foreground)' }}>{article.title}</h4>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{article.content.substring(0, 150)}...</p>
                  {article.url && <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '10px', color: 'var(--text-primary)', textDecoration: 'underline', fontSize: '0.9rem' }}>Read Original →</a>}
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
            {quote ? (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <p><strong>Exchange:</strong> {quote.fullExchangeName}</p>
                <p><strong>Market Cap:</strong> {currencySymbol}{((quote.marketCap || 0) * exchangeRate).toLocaleString()}</p>
                <p><strong>Type:</strong> {quote.quoteType}</p>
                <p><strong>Currency:</strong> {quote.currency}</p>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Profile not available.</p>
            )}
          </div>
          
          <div className="glass-panel">
            <h3 style={{ marginTop: 0, color: 'var(--foreground)' }}>Active Alerts</h3>
            <div style={{ border: '1px solid var(--danger)', padding: '10px', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.9rem' }}>
              Price Drop Alert: -5.0%
            </div>
            <div style={{ border: '1px solid var(--success)', padding: '10px', borderRadius: '8px', color: 'var(--success)', fontSize: '0.9rem', marginTop: '10px' }}>
              News Sentiment Alert: Active
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
