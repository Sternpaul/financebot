import { supabase } from '@/lib/supabase';
import { getHoldings } from '@/app/portfolio/actions';
import PortfolioCharts from '@/components/PortfolioCharts';
import PortfolioManager from '@/components/PortfolioManager';
import HoldingsList from '@/components/HoldingsList';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Portfolio() {
  const holdings = await getHoldings();

  // Handle Global Currency Context
  const cookieStore = await cookies();
  const currencyCookie = cookieStore.get('app-currency')?.value || 'USD';
  const isEur = currencyCookie === 'EUR';
  const symbol = isEur ? '€' : '$';
  const rate = isEur ? 0.92 : 1.0;

  // Fetch prices from Yahoo Finance
  let holdingsWithPrices = [];
  
  if (holdings && holdings.length > 0) {
    const symbols = holdings.filter((h: any) => !h.isCash).map((h: any) => {
        const t = h.ticker.toUpperCase();
        if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(t)) return `${t}-USD`;
        return t;
    }).join(',');

    try {
      let sparks = [];
      if (symbols.length > 0) {
        // Fetch Sparklines and Quotes combined (v7 quote is 401 Unauthorized for some IPs)
        const sparkRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=1d&interval=15m`, { next: { revalidate: 60 } });
        const sparkData = await sparkRes.json();
        sparks = sparkData.spark?.result || [];
      }
      
      holdingsWithPrices = holdings.map((h: any) => {
        if (h.isCash) {
          return {
            ...h,
            currentPrice: 1.0, // Cash is always $1
            pctChange: 0,
            longName: "Cash Balance",
            sparkline: []
          };
        }

        const t = h.ticker.toUpperCase();
        const querySym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
        const s = sparks.find((x: any) => x.symbol === querySym);
        
        let sparkline = [];
        let price = h.avg_cost;
        let pctChange = 0;
        let longName = h.ticker;

        if (s && s.response && s.response[0]) {
            const meta = s.response[0].meta;
            if (meta) {
                price = meta.regularMarketPrice || price;
                const prevClose = meta.previousClose || price;
                if (prevClose > 0) {
                    pctChange = ((price - prevClose) / prevClose) * 100;
                }
                longName = meta.shortName || meta.longName || h.ticker;
            }
            if (s.response[0].indicators && s.response[0].indicators.quote) {
                const closePrices = s.response[0].indicators.quote[0].close;
                if (closePrices) {
                   sparkline = closePrices.map((val: number, i: number) => ({ index: i, value: val })).filter((v: any) => v.value !== null);
                }
            }
        }

        return {
          ...h,
          currentPrice: price,
          pctChange: pctChange,
          longName,
          sparkline
        };
      });
    } catch (err) {
      console.error("Failed to fetch Yahoo Finance quotes", err);
      holdingsWithPrices = holdings.map(h => ({ ...h, currentPrice: h.avg_cost, pctChange: 0, longName: h.ticker, sparkline: [] }));
    }
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account', 'main')
    .order('date', { ascending: true });

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Portfolio</span></h1>
      
      {!holdings || holdings.length === 0 ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)' }}>Your portfolio ledger is currently empty. Start logging transactions!</p>
          <PortfolioManager />
        </div>
      ) : (
        <>
          <PortfolioCharts holdingsWithPrices={holdingsWithPrices} transactions={transactions || []} />
          <PortfolioManager />
          <HoldingsList holdings={holdingsWithPrices} />
        </>
      )}
    </main>
  );
}
