from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from bot.config import get_bot_config

# We can use the SharedConfig part from bot_config to get the DB URL
# Supabase URL needs asyncpg dialect for async operations
config = get_bot_config()

# Convert standard postgresql:// to postgresql+asyncpg://
db_url = config.supabase_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if "?" in db_url:
    db_url += "&prepared_statement_cache_size=0"
else:
    db_url += "?prepared_statement_cache_size=0"

# Create the async engine
engine = create_async_engine(
    db_url,
    echo=False,  # Set to True for SQL query debugging
    pool_size=10,
    max_overflow=20,
)

# Create an async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_session() -> AsyncSession:
    """Dependency / helper for getting a database session"""
    async with AsyncSessionLocal() as session:
        yield session
