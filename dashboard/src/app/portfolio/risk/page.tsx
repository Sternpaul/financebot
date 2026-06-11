import { supabase } from '@/lib/supabase';
import { getHoldings } from '@/app/portfolio/actions';
import RiskCockpit from '@/components/RiskCockpit';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RiskDashboard() {
  const holdings = await getHoldings();

  let holdingsWithPrices = [];
  const sectors: Record<string, string> = {};
  
  if (holdings && holdings.length > 0) {
    const symbols = holdings.filter((h: any) => !h.isCash).map((h: any) => {
        const t = h.ticker.toUpperCase();
        if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(t)) return `${t}-USD`;
        return t;
    }).join(',');

    try {
      let quotes = [];
      if (symbols.length > 0) {
        const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`, { next: { revalidate: 60 } });
        if (res.ok) {
            const data = await res.json();
            quotes = data.quoteResponse?.result || [];
        }
      }
      
      holdingsWithPrices = holdings.map((h: any) => {
        if (h.isCash) {
          return {
            ...h,
            currentPrice: 1.0,
          };
        }

        const t = h.ticker.toUpperCase();
        const querySym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
        const q = quotes.find((x: any) => x.symbol === querySym);
        
        let price = h.avg_cost;
        if (q && q.regularMarketPrice) {
            price = q.regularMarketPrice;
        }

        return {
          ...h,
          currentPrice: price,
        };
      });
      
      // Fetch sectors from Watchlist
      const activeTickers = holdings.filter((h: any) => !h.isCash).map((h: any) => h.ticker);
      if (activeTickers.length > 0) {
          const { data } = await supabase.from('watchlist').select('ticker, sector').in('ticker', activeTickers);
          if (data) {
              data.forEach(row => {
                  if (row.sector) sectors[row.ticker] = row.sector;
              });
          }
      }
      
    } catch (err) {
      console.error("Failed to fetch Yahoo Finance quotes for risk page", err);
      holdingsWithPrices = holdings.map((h: any) => ({ ...h, currentPrice: h.avg_cost }));
    }
  }

  return (
    <main className="page-container animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Link href="/portfolio" style={{ color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Portfolio
      </Link>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="header-title" style={{ margin: 0 }}>Risk <span className="text-gradient">Cockpit</span></h1>
      </div>
      
      <RiskCockpit holdings={holdingsWithPrices} sectors={sectors} />
    </main>
  );
}
