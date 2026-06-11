import asyncio
from bot.db.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
    print("Successfully dropped alembic_version table.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
