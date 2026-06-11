require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    const mappings = {
      '^GSPC': 'SPY',
      '^IXIC': 'QQQ',
      '^DJI': 'DIA'
    };
    for (const [oldH, newH] of Object.entries(mappings)) {
      await client.query("UPDATE content_sources SET handle = $1 WHERE handle = $2", [newH, oldH]);
    }
    console.log('Updated indices to ETFs for better RSS frequency.');
  } catch(e) { console.error(e); }
  client.end();
});
