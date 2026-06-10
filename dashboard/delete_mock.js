const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
client.connect().then(async () => {
  try {
    await client.query("DELETE FROM news_articles WHERE title IN ('Apple reaches new highs', 'The Crypto Bull Market is Back', '')");
    console.log('Mock data deleted!');
  } catch(e) { console.error(e); }
  client.end();
});
