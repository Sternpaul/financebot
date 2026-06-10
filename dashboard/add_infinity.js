const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' });

async function run() {
  await client.connect();
  const res = await client.query("SELECT id FROM content_sources WHERE platform = 'telegram' AND handle = 'infinityhedge'");
  if (res.rows.length === 0) {
    await client.query("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('telegram', 'infinityhedge', true, true)");
    console.log("Added infinityhedge to content_sources");
  } else {
    console.log("infinityhedge already exists");
  }
  await client.end();
}

run().catch(console.error);
