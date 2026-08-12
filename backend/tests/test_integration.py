"""Integration tests — require PostgreSQL (TEST_DATABASE_URL or DATABASE_URL)."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import MAX_HISTORY_MESSAGES
from app.models import AnswerFeedback, QueryLog
from app.services.chat import ChatGenerationResult, handle_chat
from app.schemas import ChatRequest, Source


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_chat_response_contains_query_id(async_client_with_db: AsyncClient) -> None:
    response = await async_client_with_db.post(
        "/api/chat",
        json={"question": "How much is tuition?", "language": "en", "history": []},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["query_id"]
    assert isinstance(body["confidence"], (int, float))
    assert body["latency_ms"] >= 0
    assert isinstance(body["sources"], list)


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_query_log_exists_for_query_id(
    async_client_with_db: AsyncClient,
    db_session: AsyncSession,
) -> None:
    response = await async_client_with_db.post(
        "/api/chat",
        json={"question": "Documents?", "language": "en"},
    )
    query_id = response.json()["query_id"]
    log = await db_session.get(QueryLog, uuid.UUID(query_id))
    assert log is not None
    assert log.question == "Documents?"


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_chat_with_valid_history(async_client_with_db: AsyncClient) -> None:
    response = await async_client_with_db.post(
        "/api/chat",
        json={
            "question": "What about part-time?",
            "language": "en",
            "history": [
                {"role": "user", "content": "Tuition for CS?"},
                {"role": "assistant", "content": "See fee schedule."},
            ],
        },
    )
    assert response.status_code == 200
    assert "retrieval:" in response.json()["answer"]


@pytest.mark.integration
async def test_chat_rejects_over_limit_history(async_client_with_db: AsyncClient) -> None:
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"msg {i}"}
        for i in range(MAX_HISTORY_MESSAGES + 1)
    ]
    response = await async_client_with_db.post(
        "/api/chat",
        json={"question": "Next?", "language": "en", "history": history},
    )
    assert response.status_code == 422


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_feedback_up_and_down(
    async_client_with_db: AsyncClient,
    db_session: AsyncSession,
) -> None:
    chat = await async_client_with_db.post(
        "/api/chat",
        json={"question": "Feedback test", "language": "en"},
    )
    query_id = chat.json()["query_id"]

    up = await async_client_with_db.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "up", "comment": None},
    )
    assert up.status_code == 200
    up_body = up.json()
    assert up_body["success"] is True
    assert up_body["feedback_id"]

    down = await async_client_with_db.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "down", "comment": "Changed mind"},
    )
    assert down.status_code == 200
    assert down.json()["feedback_id"] == up_body["feedback_id"]

    count = await db_session.scalar(select(func.count()).select_from(AnswerFeedback))
    assert count == 1
    feedback = await db_session.scalar(
        select(AnswerFeedback).where(AnswerFeedback.query_log_id == uuid.UUID(query_id))
    )
    assert feedback is not None
    assert feedback.rating == "down"


@pytest.mark.integration
async def test_unknown_query_id_returns_404(async_client_with_db: AsyncClient) -> None:
    response = await async_client_with_db.post(
        "/api/feedback",
        json={
            "query_id": "00000000-0000-4000-8000-000000000099",
            "rating": "up",
        },
    )
    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_end_to_end_chat_then_feedback(
    async_client_with_db: AsyncClient,
    db_session: AsyncSession,
) -> None:
    chat = await async_client_with_db.post(
        "/api/chat",
        json={"question": "E2E?", "language": "en", "history": []},
    )
    query_id = chat.json()["query_id"]

    feedback = await async_client_with_db.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "up", "comment": None},
    )
    assert feedback.status_code == 200
    body = feedback.json()
    assert body["success"] is True
    assert body["feedback_id"]

    stored = await db_session.scalar(
        select(AnswerFeedback).where(AnswerFeedback.query_log_id == uuid.UUID(query_id))
    )
    assert stored is not None
    assert str(stored.id) == body["feedback_id"]


@pytest.mark.integration
@pytest.mark.usefixtures("stub_chat")
async def test_concurrent_first_feedback_upsert_is_atomic(
    async_client_with_db: AsyncClient,
    db_session: AsyncSession,
) -> None:
    import asyncio

    chat = await async_client_with_db.post(
        "/api/chat",
        json={"question": "Concurrent feedback", "language": "en"},
    )
    query_id = chat.json()["query_id"]
    payload = {"query_id": query_id, "rating": "up", "comment": None}

    first, second = await asyncio.gather(
        async_client_with_db.post("/api/feedback", json=payload),
        async_client_with_db.post("/api/feedback", json=payload),
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["feedback_id"] == second.json()["feedback_id"]

    count = await db_session.scalar(select(func.count()).select_from(AnswerFeedback))
    assert count == 1


@pytest.mark.integration
async def test_handle_chat_persists_via_service(db_session: AsyncSession) -> None:
    async def stub_gen(request, retrieval_query, chunks):
        return ChatGenerationResult(
            answer="Service layer answer",
            sources=[
                Source(
                    title="Page",
                    url="https://akademiata.pl/",
                    section="S",
                    excerpt="E",
                    source_type="website",
                )
            ],
            confidence=0.8,
        )

    result = await handle_chat(
        ChatRequest(question="Service?", language="en"),
        db_session,
        answer_generator=stub_gen,
    )
    assert result.query_id
    log = await db_session.get(QueryLog, uuid.UUID(result.query_id))
    assert log is not None
    assert log.answer == "Service layer answer"
