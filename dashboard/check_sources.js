const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' });
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT platform, handle, is_active FROM content_sources WHERE platform = 'telegram'");
    console.log("TELEGRAM SOURCES:");
    console.log(res.rows);
  } catch(e) { console.error(e); }
  client.end();
});
