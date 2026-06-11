import os
from dotenv import load_dotenv
load_dotenv()
import asyncio
import asyncpg

async def run():
    url = os.getenv('SUPABASE_URL')
    try:
        conn = await asyncpg.connect(url)
        print("Success on 5432!")
        await conn.close()
    except Exception as e:
        print("Failed on 5432:", e)
        
    try:
        conn2 = await asyncpg.connect(url2)
        print("Success on 6543!")
        await conn2.close()
    except Exception as e:
        print("Failed on 6543:", e)

asyncio.run(run())
