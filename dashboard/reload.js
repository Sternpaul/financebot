require('dotenv').config({ path: '../.env' });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.SUPABASE_URL });
client.connect().then(async () => {
  try {
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('PostgREST schema cache reloaded!');
  } catch (e) {
    console.error('Failed', e.message);
  }
  client.end();
}).catch(console.error);
