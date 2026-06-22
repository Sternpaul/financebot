import asyncio
import os
import sys

# Add current dir to path to import bot
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bot.db.database import engine
from bot.db.models import Base, CuratedWebContent, RawWebContent

async def init_db():
    async with engine.begin() as conn:
        print("Creating curated_webcontent and raw_webcontent tables...")
        await conn.run_sync(Base.metadata.create_all, tables=[CuratedWebContent.__table__, RawWebContent.__table__])
        print("Done.")
    await engine.dispose()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(init_db())
