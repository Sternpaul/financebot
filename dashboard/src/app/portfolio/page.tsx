import { supabase } from '@/lib/supabase';
import PortfolioCharts from '@/components/PortfolioCharts';
import PortfolioManager from '@/components/PortfolioManager';
import HoldingsList from '@/components/HoldingsList';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Portfolio() {
  const { data: holdings, error } = await supabase
    .from('holdings')
    .select('*');

  // Handle Global Currency Context
  const cookieStore = await cookies();
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
      // 1. Fetch Quotes
      const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, { next: { revalidate: 60 } });
      const data = await res.json();
      const quotes = data.quoteResponse?.result || [];

      // 2. Fetch Sparklines
      const sparkRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=1d&interval=15m`, { next: { revalidate: 60 } });
      const sparkData = await sparkRes.json();
      const sparks = sparkData.spark?.result || [];
      
      holdingsWithPrices = holdings.map(h => {
        const t = h.ticker.toUpperCase();
        const querySym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
        const q = quotes.find((x: any) => x.symbol === querySym);
        const s = sparks.find((x: any) => x.symbol === querySym);
        
        let sparkline = [];
        if (s && s.response && s.response[0] && s.response[0].indicators && s.response[0].indicators.quote) {
            const closePrices = s.response[0].indicators.quote[0].close;
            if (closePrices) {
               sparkline = closePrices.map((val: number, i: number) => ({ index: i, value: val })).filter((v: any) => v.value !== null);
            }
        }

        return {
          ...h,
          currentPrice: q ? q.regularMarketPrice : h.avg_cost,
          pctChange: q ? q.regularMarketChangePercent : 0,
          longName: q ? q.longName || q.shortName || h.ticker : h.ticker,
          sparkline
        };
      });
    } catch (err) {
      console.error("Failed to fetch Yahoo Finance quotes", err);
      holdingsWithPrices = holdings.map(h => ({ ...h, currentPrice: h.avg_cost, pctChange: 0, longName: h.ticker, sparkline: [] }));
    }
  }

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Portfolio</span></h1>
      
      {error && <p>Error loading portfolio: {error.message}</p>}
      
      <PortfolioManager />

      {(!holdings || holdings.length === 0) && !error ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)' }}>Your portfolio is currently empty in the database. Run the seed script to test!</p>
        </div>
      ) : (
        <>
          <PortfolioCharts holdingsWithPrices={holdingsWithPrices} />
          <HoldingsList holdings={holdingsWithPrices} />
        </>
      )}
    </main>
  );
}
