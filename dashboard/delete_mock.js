require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    await client.query("DELETE FROM news_articles WHERE title IN ('Apple reaches new highs', 'The Crypto Bull Market is Back', '')");
    console.log('Mock data deleted!');
  } catch(e) { console.error(e); }
  client.end();
});
