from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from bot.config import get_bot_config

# We can use the SharedConfig part from bot_config to get the DB URL
# Supabase URL needs asyncpg dialect for async operations
config = get_bot_config()

# Convert standard postgresql:// to postgresql+asyncpg://
db_url = config.supabase_url
import uuid

if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

import socket
from urllib.parse import urlparse, urlunparse

# Remove URL-based statement cache to prevent asyncpg string parsing TypeError

# Force IPv4 resolution to prevent Docker/asyncio from randomly attempting IPv6 and crashing with Errno 101
parsed = urlparse(db_url)

# STRIP any query parameters that might have been hardcoded in the .env string to prevent asyncpg crashes!
parsed = parsed._replace(query="")
db_url = urlunparse(parsed)
if parsed.hostname:
    try:
        # Resolve specifically for AF_INET (IPv4)
        addr_info = socket.getaddrinfo(parsed.hostname, parsed.port, family=socket.AF_INET)
        if addr_info:
            ipv4 = addr_info[0][4][0]
            # Replace hostname with resolved IPv4 IP while keeping port/credentials intact
            netloc = parsed.netloc.replace(parsed.hostname, ipv4)
            db_url = urlunparse(parsed._replace(netloc=netloc))
    except Exception as e:
        print(f"Warning: Failed to resolve IPv4 for {parsed.hostname}: {e}")

# Create the async engine
engine = create_async_engine(
    db_url,
    echo=False,  # Set to True for SQL query debugging
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True, # Prevent dropped connection errors from ELB
    prepared_statement_name_func=lambda: f"__asyncpg_{uuid.uuid4()}__"
)

# Create an async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_session() -> AsyncSession:
    """Dependency / helper for getting a database session"""
    async with AsyncSessionLocal() as session:
        yield session
