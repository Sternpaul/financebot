import asyncio
from sqlalchemy import text
from bot.db.database import get_session

async def main():
    async with get_session() as session:
        # Grant permissions to Supabase anonymous role
        await session.execute(text("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;"))
        await session.execute(text("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;"))
        
        # Insert default sources if empty
        res = await session.execute(text("SELECT count(*) FROM content_sources"))
        if res.scalar() == 0:
            await session.execute(text("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('telegram', 'WalterBloomberg', true, true);"))
            await session.execute(text("INSERT INTO content_sources (platform, handle, is_active, is_core) VALUES ('telegram', 'ZoomerfiedNews', true, true);"))
            print("Inserted defaults!")
        await session.commit()
    print("Permissions granted!")

if __name__ == "__main__":
    asyncio.run(main())
