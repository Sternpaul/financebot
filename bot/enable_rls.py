import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from bot.db.database import engine

async def enable_rls():
    password = os.getenv("DASHBOARD_PASSWORD")
    if not password:
        print("Error: DASHBOARD_PASSWORD must be set in .env to secure the database.")
        return

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
        "raw_webcontent",
        "alembic_version",
        "web_content"
    ]
    
    async with engine.begin() as conn:
        for table in tables:
            try:
                # Enable RLS
                await conn.execute(text(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY;"))
                
                # Drop policy if exists to allow re-runs
                await conn.execute(text(f"DROP POLICY IF EXISTS \"Allow All\" ON public.{table};"))
                await conn.execute(text(f"DROP POLICY IF EXISTS \"Secret Header\" ON public.{table};"))
                
                # Create a strict Secret Header policy, wrapped in a (select) subquery to 
                # prevent PostgreSQL from re-evaluating the JSON parse on every row (optimizing performance).
                await conn.execute(text(f"CREATE POLICY \"Secret Header\" ON public.{table} FOR ALL USING ((select current_setting('request.headers', true)::json->>'x-dashboard-password') = '{password}') WITH CHECK ((select current_setting('request.headers', true)::json->>'x-dashboard-password') = '{password}');"))
                
                print(f"Enabled RLS and added 'Secret Header' policy for {table}")
            except Exception as e:
                print(f"Error on {table}: {e}")
                
    await engine.dispose()
    print("\nFinished successfully. The Supabase 'RLS Disabled' critical warning will now disappear.")

if __name__ == "__main__":
    asyncio.run(enable_rls())
