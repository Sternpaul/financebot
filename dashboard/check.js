const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' });
client.connect().then(async () => {
  const res = await client.query("SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('news_articles', 'content_sources');");
  console.log('RLS Status:', res.rows);
  const res2 = await client.query("SELECT * FROM content_sources");
  console.log('Content Sources:', res2.rows);
  client.end();
});
