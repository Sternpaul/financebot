import asyncio
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres')
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE ingestion_logs DISABLE ROW LEVEL SECURITY;'))
    conn.commit()
    print('RLS Disabled')
