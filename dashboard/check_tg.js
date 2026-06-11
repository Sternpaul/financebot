require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT title, content, posted_at, url FROM news_articles WHERE source_handle = 'whale_alert' ORDER BY posted_at DESC LIMIT 3");
    console.log("WHALE ALERT POSTS:");
    console.log(res.rows);
  } catch(e) { console.error(e); }
  client.end();
});
