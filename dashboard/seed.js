require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    const sources = [
      { platform: 'telegram', handle: 'whale_alert', is_core: true },
      { platform: 'telegram', handle: 'cointelegraph', is_core: true },
      { platform: 'substack', handle: 'cryptohayes', is_core: true },
      { platform: 'substack', handle: 'thebearcave', is_core: true }
    ];
    for (const s of sources) {
      const res = await client.query('SELECT id FROM content_sources WHERE platform = $1 AND handle = $2', [s.platform, s.handle]);
      if (res.rows.length === 0) {
        await client.query('INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ($1, $2, true, $3)', [s.platform, s.handle, s.is_core]);
      }
    }
    
    // Insert mock feed data
    const news = [
      { platform: 'yfinance', handle: 'AAPL', author: 'Yahoo Finance', title: 'Apple reaches new highs', content: 'Apple stock surged today amid strong earnings.', url: 'https://finance.yahoo.com/news/1' },
      { platform: 'substack', handle: 'cryptohayes', author: 'Arthur Hayes', title: 'The Crypto Bull Market is Back', content: '<p>Arthur Hayes argues that macroeconomic trends point strictly upward.</p>', url: 'https://cryptohayes.substack.com/p/1' },
      { platform: 'telegram', handle: 'whale_alert', author: 'whale_alert', title: '', content: '🚨 10,000 BTC transferred to Binance', url: 'https://t.me/whale_alert/1' },
    ];
    for (const item of news) {
      await client.query('INSERT INTO news_articles (source_platform, source_handle, author_name, title, content, url, posted_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT DO NOTHING', 
        [item.platform, item.handle, item.author, item.title, item.content, item.url]);
    }
    console.log('Seeded perfectly.');
  } catch(e) { console.error(e); }
  client.end();
});
