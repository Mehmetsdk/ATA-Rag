"""Async SQLAlchemy engine and session dependency."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_async_engine(settings.database_url, echo=False)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """One transaction per request — services flush; commit happens here."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def ensure_pgvector_extension(conn) -> None:
    """Enable pgvector before creating tables that declare Vector columns."""
    try:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception as exc:
        raise RuntimeError(
            "Failed to enable the pgvector extension (CREATE EXTENSION vector). "
            "The database user must have permission to create extensions, or an "
            "administrator must run: CREATE EXTENSION IF NOT EXISTS vector; "
            "SQLite and other non-PostgreSQL backends are not supported."
        ) from exc


async def init_db() -> None:
    """Prepare PostgreSQL (pgvector) and create tables via metadata.create_all."""
    from app import models  # noqa: F401 — register models on metadata

    engine = get_engine()
    async with engine.begin() as conn:
        await ensure_pgvector_extension(conn)
        await conn.run_sync(Base.metadata.create_all)


def reset_engine() -> None:
    """Test helper — drop cached engine between runs."""
    global _engine, _session_factory
    _engine = None
    _session_factory = None
