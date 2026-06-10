const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
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
