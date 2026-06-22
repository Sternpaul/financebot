import { supabaseAdmin } from '@/lib/supabaseAdmin';
import WatchlistManager from '@/components/WatchlistManager';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const { data: watchlist } = await supabaseAdmin
    .from('watchlist')
    .select('*')
    .order('ticker', { ascending: true });

  let watchlistWithPrices = [];
  if (watchlist && watchlist.length > 0) {
    const symbols = watchlist.map(h => {
        const t = h.ticker.toUpperCase();
        return ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
    }).join(',');

    try {
      const sparkRes = await fetch(`https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=1d&interval=15m`, { next: { revalidate: 60 } });
      const sparkData = await sparkRes.json();
      const sparks = sparkData.spark?.result || [];
      
      watchlistWithPrices = watchlist.map(h => {
        const t = h.ticker.toUpperCase();
        const querySym = ['BTC', 'ETH', 'SOL', 'DOGE'].includes(t) ? `${t}-USD` : t;
        const s = sparks.find((x: any) => x.symbol === querySym);
        
        let sparkline = [];
        let price = 0;
        let pctChange = 0;
        let longName = h.name;
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
                longName = meta.shortName || meta.longName || longName;
                
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
          avg_cost: 0,
          shares: 0,
          marketState,
          regularMarketStart
        };
      });
    } catch (err) {
      console.error(err);
      watchlistWithPrices = watchlist.map((h: any) => ({ ...h, currentPrice: 0, pctChange: 0, longName: h.name, sparkline: [], avg_cost: 0, shares: 0, marketState: 'UNKNOWN', regularMarketStart: 0 }));
    }
  }

  return (
    <main className="page-container animate-fade-in">
      <h1 className="header-title">My <span className="text-gradient">Watchlist</span></h1>
      <WatchlistManager initialWatchlist={watchlistWithPrices} />
    </main>
  );
}
