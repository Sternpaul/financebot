require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT id FROM content_sources WHERE platform = 'yfinance' AND handle = 'GeneralMarket'");
    if (res.rows.length === 0) {
      await client.query("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('yfinance', 'GeneralMarket', true, true)");
      console.log('Inserted GeneralMarket source.');
    } else {
      console.log('GeneralMarket source already exists.');
    }
  } catch(e) { console.error(e); }
  client.end();
});
