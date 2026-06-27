from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.database.connect_args import asyncpg_connect_args

_settings = get_settings()

# Supabase pooler (pgbouncer) needs NullPool + no prepared statement cache
engine = create_async_engine(
    _settings.database_url,
    echo=_settings.sql_echo,
    poolclass=NullPool,
    connect_args=asyncpg_connect_args(command_timeout=_settings.database_command_timeout),
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
