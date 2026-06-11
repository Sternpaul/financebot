require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
async function run() {
  await client.connect();
  await client.query("ALTER TABLE ingestion_logs DISABLE ROW LEVEL SECURITY;");
  console.log("Disabled RLS on ingestion_logs");
  await client.end();
}
run().catch(console.error);
