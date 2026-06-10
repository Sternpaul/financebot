const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' });
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT title, content, posted_at, url FROM news_articles WHERE source_handle = 'whale_alert' ORDER BY posted_at DESC LIMIT 3");
    console.log("WHALE ALERT POSTS:");
    console.log(res.rows);
  } catch(e) { console.error(e); }
  client.end();
});
