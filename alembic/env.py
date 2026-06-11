import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv()

import pgvector.sqlalchemy
from bot.db.models import Base
from bot.config import get_bot_config

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    config_obj = get_bot_config()
    db_url = config_obj.supabase_url
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    from urllib.parse import urlparse, urlunparse
    import socket
    parsed = urlparse(db_url)
    parsed = parsed._replace(query="")
    db_url = urlunparse(parsed)
    if parsed.hostname:
        try:
            addr_info = socket.getaddrinfo(parsed.hostname, parsed.port, family=socket.AF_INET)
            if addr_info:
                ipv4 = addr_info[0][4][0]
                netloc = parsed.netloc.replace(parsed.hostname, ipv4)
                db_url = urlunparse(parsed._replace(netloc=netloc))
        except Exception:
            pass

    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    config_obj = get_bot_config()
    db_url = config_obj.supabase_url
    import uuid
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
    from urllib.parse import urlparse, urlunparse
    import socket
    parsed = urlparse(db_url)
    
    # Bypass PgBouncer (6543) by connecting directly to the database port (5432)
    # This prevents the DuplicatePreparedStatementError during Alembic introspection
    if parsed.port == 6543:
        netloc = parsed.netloc.replace(":6543", ":5432")
        parsed = parsed._replace(netloc=netloc)
        
    parsed = parsed._replace(query="")
    db_url = urlunparse(parsed)
    if parsed.hostname:
        try:
            addr_info = socket.getaddrinfo(parsed.hostname, parsed.port, family=socket.AF_INET)
            if addr_info:
                ipv4 = addr_info[0][4][0]
                netloc = parsed.netloc.replace(parsed.hostname, ipv4)
                db_url = urlunparse(parsed._replace(netloc=netloc))
        except Exception:
            pass

    from sqlalchemy.ext.asyncio import create_async_engine
    connectable = create_async_engine(
        db_url,
        poolclass=pool.NullPool,
        connect_args={
            "statement_cache_size": 0
        }
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
