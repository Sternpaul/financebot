import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols');
  const range = searchParams.get('range') || '1mo';
  const interval = searchParams.get('interval') || '1d';

  if (!symbols) {
    return NextResponse.json({ error: 'Missing symbols parameter' }, { status: 400 });
  }

  const symbolArray = symbols.split(',');
  const apiKey = process.env.MASSIVE_API_KEY;

  // Try Massive API (Polygon) if key exists and we have fewer than 5 symbols (due to 5 calls/min rate limit)
  if (apiKey && apiKey !== 'your_massive_key' && symbolArray.length <= 4 && ['1mo', '1y', 'max'].includes(range)) {
    try {
      const timespan = interval === '1d' ? 'day' : interval === '1wk' ? 'week' : 'month';
      const to = new Date().toISOString().split('T')[0];
      const fromDate = new Date();
      if (range === '1mo') fromDate.setMonth(fromDate.getMonth() - 1);
      else if (range === '1y') fromDate.setFullYear(fromDate.getFullYear() - 1);
      else fromDate.setFullYear(fromDate.getFullYear() - 5);
      const from = fromDate.toISOString().split('T')[0];

      const massivePromises = symbolArray.map(async (sym) => {
        // Handle Crypto formatting (BTC-USD -> X:BTCUSD)
        const polySym = sym.includes('-USD') ? `X:${sym.replace('-', '')}` : sym;
        const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/${polySym}/range/1/${timespan}/${from}/${to}?apiKey=${apiKey}`);
        if (!res.ok) throw new Error(`Polygon rate limit or error: ${res.status}`);
        const data = await res.json();
        
        // Map Polygon format back to Yahoo format for PortfolioCharts compatibility
        return {
          symbol: sym,
          response: [{
            meta: { regularMarketPrice: data.results?.[data.results.length - 1]?.c || 0, previousClose: data.results?.[0]?.c || 0 },
            timestamp: data.results?.map((r: any) => Math.floor(r.t / 1000)) || [],
            indicators: { quote: [{ close: data.results?.map((r: any) => r.c) || [] }] }
          }]
        };
      });

      const results = await Promise.all(massivePromises);
      return NextResponse.json({ spark: { result: results } });
    } catch (err) {
      console.warn("Massive API failed (likely rate limit). Falling back to Yahoo Finance.", err);
    }
  }

  // Fallback to Yahoo Finance Spark API
  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/spark?symbols=${symbols}&range=${range}&interval=${interval}`;
    const yahooRes = await fetch(yahooUrl, { next: { revalidate: 60 } });
    
    if (!yahooRes.ok) {
        throw new Error(`Yahoo Finance API error: ${yahooRes.status}`);
    }

    const data = await yahooRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error fetching historical portfolio data", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
