const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  try {
    // Delete old GeneralMarket
    await client.query("DELETE FROM content_sources WHERE platform = 'yfinance' AND handle = 'GeneralMarket'");

    const regions = [
      { handle: '^GSPC', name: 'S&P 500', region: 'US' },
      { handle: '^IXIC', name: 'NASDAQ', region: 'US' },
      { handle: '^DJI', name: 'Dow Jones', region: 'US' },
      { handle: '^GDAXI', name: 'DAX', region: 'EU' },
      { handle: '^STOXX50E', name: 'Euro Stoxx 50', region: 'EU' },
      { handle: '^FTSE', name: 'FTSE 100', region: 'EU' },
      { handle: '000001.SS', name: 'SSE Composite', region: 'Asia' },
      { handle: '^N225', name: 'Nikkei 225', region: 'Asia' },
      { handle: '^KS11', name: 'KOSPI', region: 'Asia' },
      { handle: '^NSEI', name: 'Nifty 50', region: 'Emerging Markets' },
      { handle: '^BVSP', name: 'Bovespa', region: 'Emerging Markets' }
    ];

    for (const item of regions) {
      const res = await client.query("SELECT id FROM content_sources WHERE platform = 'yfinance' AND handle = $1", [item.handle]);
      if (res.rows.length === 0) {
        // We will store the readable name in a way that we can extract it, but actually `handle` is what Yahoo uses. 
        // We can just rely on the frontend knowing what `^GSPC` means since there's no name field on content_sources.
        await client.query("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('yfinance', $1, true, false)", [item.handle]);
        console.log(`Inserted ${item.handle} (${item.region})`);
      }
    }
  } catch(e) { console.error(e); }
  client.end();
});
