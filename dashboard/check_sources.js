require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    const res = await client.query("SELECT platform, handle, is_active FROM content_sources WHERE platform = 'telegram'");
    console.log("TELEGRAM SOURCES:");
    console.log(res.rows);
  } catch(e) { console.error(e); }
  client.end();
});
