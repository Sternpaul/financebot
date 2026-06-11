import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { getHoldings, getExchangeRate } from '@/app/portfolio/actions';
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
  
  // Fetch real exchange rate for USD to EUR conversion.
  // EURUSD=X gives how many USD per 1 EUR (e.g. 1.08).
  // So to convert a USD portfolio value to EUR, we multiply by (1 / 1.08).
  let rate = 1.0;
  if (isEur) {
    const eurusd = await getExchangeRate('EURUSD=X');
    if (eurusd) {
       rate = 1.0 / eurusd;
    } else {
       rate = 0.92; // Fallback
    }
  }

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
        let marketState = 'UNKNOWN';
        let regularMarketStart = 0;

        if (s && s.response && s.response[0]) {
            const meta = s.response[0].meta;
            if (meta) {
                price = meta.regularMarketPrice || price;
                const prevClose = meta.previousClose || price;
                if (prevClose > 0) {
                    pctChange = ((price - prevClose) / prevClose) * 100;
                }
                longName = meta.shortName || meta.longName || h.ticker;
                
                if (meta.currentTradingPeriod) {
                  const now = Math.floor(Date.now() / 1000);
                  const p = meta.currentTradingPeriod;
                  if (p.regular && now >= p.regular.start && now < p.regular.end) marketState = 'OPEN';
                  else if (p.pre && now >= p.pre.start && now < p.pre.end) marketState = 'PRE';
                  else if (p.post && now >= p.post.start && now < p.post.end) marketState = 'POST';
                  else marketState = 'CLOSED';
                  
                  regularMarketStart = p.regular?.start || 0;
                }
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
          sparkline,
          marketState,
          regularMarketStart
        };
      });
    } catch (err) {
      console.error("Failed to fetch Yahoo Finance quotes", err);
      holdingsWithPrices = holdings.map((h: any) => ({ ...h, currentPrice: h.avg_cost, pctChange: 0, longName: h.ticker, sparkline: [], marketState: 'UNKNOWN', regularMarketStart: 0 }));
    }
  }

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account', 'main')
    .order('date', { ascending: true });

  return (
    <main className="page-container animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="header-title" style={{ margin: 0 }}>My <span className="text-gradient">Portfolio</span></h1>
        <Link href="/portfolio/risk" style={{
          padding: '8px 16px',
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          textDecoration: 'none',
          borderRadius: '20px',
          border: '1px solid var(--glass-border)',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: '500'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Risk Cockpit →
        </Link>
      </div>
      
      {!holdings || holdings.length === 0 ? (
        <div className="glass-panel">
          <p style={{ color: 'var(--text-secondary)' }}>Your portfolio ledger is currently empty. Start logging transactions!</p>
          <PortfolioManager transactions={transactions || []} />
        </div>
      ) : (
        <>
          <PortfolioCharts holdingsWithPrices={holdingsWithPrices} transactions={transactions || []} exchangeRate={rate} />
          <PortfolioManager transactions={transactions || []} />
          <HoldingsList holdings={holdingsWithPrices} exchangeRate={rate} />
        </>
      )}
    </main>
  );
}
