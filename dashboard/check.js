require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  const res = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('news_articles', 'content_sources');");
  console.log('RLS Status:', res.rows);
  const res2 = await client.query("SELECT * FROM content_sources");
  console.log('Content Sources:', res2.rows);
  client.end();
});
