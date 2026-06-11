import asyncio
from bot.db.database import get_session
from sqlalchemy import text

async def reset_alembic():
    try:
        async with get_session() as session:
            await session.execute(text('DROP TABLE IF EXISTS alembic_version;'))
            await session.commit()
        print("Successfully dropped alembic_version table.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(reset_alembic())
