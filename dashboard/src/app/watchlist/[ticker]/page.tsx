import { supabaseAdmin } from '@/lib/supabaseAdmin';
import Link from 'next/link';
import { cookies } from 'next/headers';
import AlertsManager from '@/components/AlertsManager';
import { getExchangeRate } from '@/app/portfolio/actions';
import ExplainButton from '@/components/ExplainButton';

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

  // 1.5 Fetch Watchlist Data from DB to get custom_alerts
  let watchlistData = null;
  try {
    const { data } = await supabaseAdmin.from('watchlist').select('*').eq('ticker', ticker).single();
    if (data) watchlistData = data;
  } catch(e) {
      console.error(e);
  }

  // Handle Global Context
  const cookieStore = await cookies();
  const currencyCookie = cookieStore.get('app-currency')?.value || 'USD';
  const themeCookie = cookieStore.get('app-theme')?.value || 'dark';
  const isEur = currencyCookie === 'EUR';
  const currencySymbol = isEur ? '€' : '$';
  
  let exchangeRate = 1.0;
  if (isEur) {
    const eurusd = await getExchangeRate('EURUSD=X');
    if (eurusd) {
       exchangeRate = 1.0 / eurusd;
    } else {
       exchangeRate = 0.92;
    }
  }

  // 2. Fetch News from our Supabase DB
  let news = [];
  let chartData = [];
  let marketState = 'UNKNOWN';
  let price = quote?.regularMarketPrice || 0;
  let pctChange = quote?.regularMarketChangePercent || 0;

  try {
    const quoteSym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(ticker) ? `${ticker}-USD` : ticker;
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${quoteSym}?interval=15m&range=1d`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart.result[0].meta;
      const quotes = data.chart.result[0].indicators.quote[0];
      const timestamps = data.chart.result[0].timestamp;

      if (meta && meta.currentTradingPeriod) {
        const now = Math.floor(Date.now() / 1000);
        const p = meta.currentTradingPeriod;
        if (p.regular && now >= p.regular.start && now < p.regular.end) marketState = 'OPEN';
        else if (p.pre && now >= p.pre.start && now < p.pre.end) marketState = 'PRE';
        else if (p.post && now >= p.post.start && now < p.post.end) marketState = 'POST';
        else marketState = 'CLOSED';
      }

      price = meta.regularMarketPrice;
      if (meta.previousClose && meta.previousClose > 0) {
        pctChange = ((price - meta.previousClose) / meta.previousClose) * 100;
      }

      if (timestamps && quotes && quotes.close) {
        chartData = timestamps.map((t: number, i: number) => ({
          time: new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: quotes.close[i] !== null ? quotes.close[i] * exchangeRate : null
        })).filter((d: any) => d.value !== null);
      }
    }
  } catch (err) {
    console.error("Failed to fetch yahoo chart for", ticker, err);
  }

  try {
    const { data } = await supabaseAdmin
      .from('news_articles')
      .select('*')
      .or(`source_handle.eq.${ticker},tickers_mentioned.cs.{${ticker}}`)
      .order('posted_at', { ascending: false })
      .limit(10);
    if (data) news = data;
  } catch(e) {
      console.error(e);
  }

  const change = (price * (pctChange / 100));
  const isPositive = pctChange >= 0;

  return (
    <main className="page-container animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link href="/watchlist" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Watchlist
      </Link>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', color: 'var(--foreground)' }}>{ticker}</h1>
            {marketState !== 'UNKNOWN' && (
               <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px", padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                  <span style={{ 
                    fontSize: "0.6rem",
                    color: marketState === 'OPEN' ? 'var(--success)' : 
                           ['PRE', 'POST'].includes(marketState) ? '#FFBB28' : 'var(--danger)' 
                  }}>●</span>
                  {marketState === 'OPEN' ? 'Market Open' : 
                   marketState === 'PRE' ? 'Pre-Market' : 
                   marketState === 'POST' ? 'Post-Market' : 'Market Closed'}
               </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {quote?.longName && <h2 style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 'normal' }}>{quote.longName}</h2>}
            <ExplainButton ticker={ticker} />
          </div>
        </div>
        {quote && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>
              {currencySymbol}{(price * exchangeRate).toFixed(2)}
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '500', color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
              {isPositive ? '+' : ''}{(change * exchangeRate).toFixed(2)} ({pctChange.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ minHeight: '500px', padding: 0, overflow: 'hidden', display: 'flex' }}>
            <iframe 
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_123&symbol=${ticker}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=${themeCookie}&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${ticker}`}
              style={{ width: '100%', height: '500px', flex: 1 }}
              frameBorder="0"
              allowFullScreen
            ></iframe>
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
          
          <AlertsManager ticker={ticker} initialAlerts={watchlistData?.custom_alerts || {}} currentPrice={price} />

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
        </div>
      </div>
    </main>
  );
}
