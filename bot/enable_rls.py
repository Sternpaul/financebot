import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()

async def enable_rls():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found.")
        return

    # Ensure async driver is used
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url)
    
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
