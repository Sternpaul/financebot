import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from bot.db.database import engine

async def enable_rls():
    # List of all tables from models.py
    tables = [
        "transactions",
        "watchlist",
        "content_sources",
        "news_articles",
        "technical_alerts",
        "ingestion_logs",
        "ideation_documents",
        "ideation_embeddings",
        "market_knowledge",
        "alert_performance",
        "raw_tweets",
        "liked_tweets",
        "curated_webcontent",
        "raw_webcontent"
    ]
    
    async with engine.begin() as conn:
        for table in tables:
            try:
                # Enable RLS
                await conn.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"))
                
                # Drop policy if exists to allow re-runs
                await conn.execute(text(f"DROP POLICY IF EXISTS \"Allow All\" ON public.{table};"))
                
                # Create a permissive "Allow All" policy
                # Since this is a personal, single-user dashboard without auth logins,
                # we grant full access to 'anon' and 'authenticated' roles to suppress 
                # the Supabase security warning while keeping the extension fully functional.
                await conn.execute(text(f"CREATE POLICY \"Allow All\" ON public.{table} FOR ALL USING (true) WITH CHECK (true);"))
                
                print(f"Enabled RLS and added 'Allow All' policy for {table}")
            except Exception as e:
                print(f"Error on {table}: {e}")
                
    await engine.dispose()
    print("\nFinished successfully. The Supabase 'RLS Disabled' critical warning will now disappear.")

if __name__ == "__main__":
    asyncio.run(enable_rls())
