import asyncio
from sqlalchemy import text
from bot.db.database import get_session

async def main():
    async with get_session() as session:
        # Clear existing
        await session.execute(text("DELETE FROM holdings"))
        
        # Insert mock portfolio
        await session.execute(text("INSERT INTO holdings (ticker, account, shares, avg_cost) VALUES ('AAPL', 'main', 50, 150.00)"))
        await session.execute(text("INSERT INTO holdings (ticker, account, shares, avg_cost) VALUES ('TSLA', 'main', 20, 180.00)"))
        await session.execute(text("INSERT INTO holdings (ticker, account, shares, avg_cost) VALUES ('BTC', 'main', 0.5, 60000.00)"))
        await session.execute(text("INSERT INTO holdings (ticker, account, shares, avg_cost) VALUES ('PLTR', 'main', 200, 15.00)"))
        
        await session.commit()
    print("Mock portfolio injected!")

if __name__ == "__main__":
    asyncio.run(main())
