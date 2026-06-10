import asyncio
from bot.db.database import AsyncSessionLocal
from bot.services.news import is_duplicate_article
from bot.db.models import NewsArticle

async def run():
    async with AsyncSessionLocal() as session:
        # Check an exact string
        # Let's just insert a dummy and check
        dummy = NewsArticle(
            source_platform='test',
            source_handle='test',
            author_name='test',
            title="FED KEEPS RATES UNCHANGED IN JUNE",
            content="The Federal Reserve has decided to keep interest rates steady today.",
            url="http://test.com/1"
        )
        session.add(dummy)
        await session.commit()
        
        print("Inserted dummy.")
        
        # Now check if it's considered duplicate
        test_str = "FED KEEPS RATES UNCHANGED IN JUNE The Federal Reserve has decided to keep interest rates steady today."
        is_dup = await is_duplicate_article(session, test_str, threshold=0.95)
        print("Is duplicate (exact)?", is_dup)
        
        test_str_2 = "BREAKING: FED KEEPS RATES UNCHANGED IN JUNE The Federal Reserve has decided to keep interest rates steady today."
        is_dup_2 = await is_duplicate_article(session, test_str_2, threshold=0.90)
        print("Is duplicate (with breaking added, threshold 0.90)?", is_dup_2)
        
        # Cleanup
        await session.delete(dummy)
        await session.commit()

if __name__ == "__main__":
    asyncio.run(run())
