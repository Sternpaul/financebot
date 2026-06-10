import asyncio
from bot.db.database import engine
from bot.db.models import Base

async def run():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database schema updated.")

if __name__ == "__main__":
    asyncio.run(run())
