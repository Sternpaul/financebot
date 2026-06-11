require('dotenv').config();
// removed

// We need the URL and anon key from bot/config.py or dashboard/.env.local
const url = "https://dnzjzzshkzdvucggmnhq.supabase.co";
// Wait, I don't know the anon key!
// Let's use pg directly to check if there are rows in ingestion_logs.

const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });

async function run() {
  await client.connect();
  const res = await client.query('SELECT * FROM ingestion_logs ORDER BY timestamp DESC LIMIT 5');
  console.log('Rows in ingestion_logs:', res.rows.length);
  console.log(res.rows);
  await client.end();
}

run().catch(console.error);
