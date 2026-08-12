"""Shared pytest fixtures."""

from __future__ import annotations

import os
import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session_factory, init_db, reset_engine
from app.main import app
from app.services.chat import ChatGenerationResult, handle_chat
from app.schemas import ChatRequest, Source


def _test_database_url() -> str | None:
    return os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")


@pytest.fixture(autouse=True)
def _default_cors_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000")
    get_settings.cache_clear()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    database_url = _test_database_url()
    if not database_url or not database_url.startswith("postgresql"):
        pytest.skip("PostgreSQL TEST_DATABASE_URL or DATABASE_URL required for DB integration tests")

    reset_engine()
    get_settings.cache_clear()
    os.environ["DATABASE_URL"] = database_url

    await init_db()
    factory = get_session_factory()
    async with factory() as session:
        yield session
        await session.rollback()


async def _stub_generator(
    request: ChatRequest,
    retrieval_query: str,
    chunks: list,
) -> ChatGenerationResult:
    return ChatGenerationResult(
        answer=f"Stub answer for: {request.question} (retrieval: {retrieval_query})",
        sources=[
            Source(
                title="Admissions",
                url="https://akademiata.pl/",
                section="Fees",
                excerpt="Stub excerpt",
                source_type="website",
            )
        ],
        confidence=0.84,
    )


@pytest.fixture
async def async_client_with_db(
    db_session: AsyncSession,
) -> AsyncGenerator[AsyncClient, None]:
    from app.db import get_db

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def stub_chat(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _stub(request: ChatRequest, session: AsyncSession):
        return await handle_chat(
            request,
            session,
            answer_generator=_stub_generator,
        )

    monkeypatch.setattr("app.routers.chat.handle_chat", _stub)
