import { supabase } from '@/lib/supabase';
import PortfolioCharts from '@/components/PortfolioCharts';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Portfolio() {
  const { data: holdings, error } = await supabase
    .from('holdings')
    .select('*');

  // Handle Global Currency Context
  const cookieStore = cookies();
  const currencyCookie = cookieStore.get('app-currency')?.value || 'USD';
  const isEur = currencyCookie === 'EUR';
  const symbol = isEur ? '€' : '$';
  const rate = isEur ? 0.92 : 1.0;

  // Fetch prices from Yahoo Finance
  let holdingsWithPrices = [];
  
  if (holdings && holdings.length > 0) {
    const symbols = holdings.map(h => {
        const t = h.ticker.toUpperCase();
        if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(t)) return `${t}-USD`;
        return t;
    }).join(',');

    try {
      const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, { next: { revalidate: 60 } });
      const data = await res.json();
      const quotes = data.quoteResponse?.result || [];
      
      holdingsWithPrices = holdings.map(h => {
        const t = h.ticker.toUpperCase();
        const querySym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
        const q = quotes.find((x: any) => x.symbol === querySym);
        return {
          ...h,
          currentPrice: q ? q.regularMarketPrice : h.average_price,
          pctChange: q ? q.regularMarketChangePercent : 0
        };
      });
    } catch (err) {
      console.error("Failed to fetch Yahoo Finance quotes", err);
      holdingsWithPrices = holdings.map(h => ({ ...h, currentPrice: h.average_price, pctChange: 0 }));
    }
  }

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Portfolio</span></h1>
      
      {error && <p>Error loading portfolio: {error.message}</p>}
      {(!holdings || holdings.length === 0) && !error ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)' }}>Your portfolio is currently empty in the database. Run the seed script to test!</p>
        </div>
      ) : (
        <>
          <PortfolioCharts holdingsWithPrices={holdingsWithPrices} />

          <h2 style={{ marginTop: '40px', color: 'var(--foreground)' }}>Individual Holdings</h2>
          <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {holdingsWithPrices.map((asset) => (
              <div key={asset.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{asset.ticker}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{asset.quantity} shares</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Avg Entry Price</span>
                  <span style={{ color: 'var(--foreground)' }}>{symbol}{(asset.average_price * rate).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Price</span>
                  <span style={{ color: 'var(--foreground)' }}>{symbol}{(asset.currentPrice * rate).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '10px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total P&L</span>
                  <span style={{ color: (asset.currentPrice - asset.average_price) >= 0 ? '#4caf50' : '#ff3366', fontWeight: 'bold' }}>
                    {(asset.currentPrice - asset.average_price) >= 0 ? '+' : ''}
                    {(((asset.currentPrice - asset.average_price) / asset.average_price) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
