import os
from dotenv import load_dotenv
load_dotenv()
import asyncio
from sqlalchemy import create_engine, text
engine = create_engine(os.getenv('SUPABASE_URL'))
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE ingestion_logs DISABLE ROW LEVEL SECURITY;'))
    conn.commit()
    print('RLS Disabled')
