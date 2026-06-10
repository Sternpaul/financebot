const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' });
client.connect().then(async () => {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingestion_logs (
        id BIGSERIAL PRIMARY KEY,
        source_platform VARCHAR NOT NULL,
        source_handle VARCHAR NOT NULL,
        status VARCHAR NOT NULL,
        message TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("DB Updated");
  } catch(e) { console.error(e); }
  client.end();
});
