import asyncio
import asyncpg

async def run():
    url = "postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
    try:
        conn = await asyncpg.connect(url)
        print("Success on 5432!")
        await conn.close()
    except Exception as e:
        print("Failed on 5432:", e)
        
    url2 = "postgresql://postgres.dnzjzzshkzdvucggmnhq:REDACTED_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
    try:
        conn2 = await asyncpg.connect(url2)
        print("Success on 6543!")
        await conn2.close()
    except Exception as e:
        print("Failed on 6543:", e)

asyncio.run(run())
