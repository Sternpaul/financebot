const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' });
async function run() {
  await client.connect();
  await client.query("ALTER TABLE ingestion_logs DISABLE ROW LEVEL SECURITY;");
  console.log("Disabled RLS on ingestion_logs");
  await client.end();
}
run().catch(console.error);
