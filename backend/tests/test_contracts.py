"""Contract-level tests for CONTRACTS.md §3."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import MAX_HISTORY_CONTENT_LENGTH, MAX_HISTORY_MESSAGES
from app.repository import ChatRepository
from app.schemas import ChatRequest, FeedbackRequest, HistoryMessage


def test_chat_request_schema_requires_question_and_accepts_history() -> None:
    payload = ChatRequest(
        question="How do I apply?",
        language="en",
        history=[
            HistoryMessage(role="user", content="Hi"),
            HistoryMessage(role="assistant", content="Hello — how can I help?"),
        ],
    )
    dumped = payload.model_dump()
    assert dumped["question"] == "How do I apply?"
    assert dumped["language"] == "en"
    assert len(dumped["history"]) == 2


def test_chat_request_rejects_blank_question() -> None:
    with pytest.raises(ValidationError):
        ChatRequest(question="   ", language="en", history=[])


def test_chat_request_defaults_history_to_empty() -> None:
    payload = ChatRequest(question="Tuition?", language="en")
    assert payload.history == []


def test_chat_request_rejects_over_limit_history() -> None:
    history = [
        HistoryMessage(role="user" if i % 2 == 0 else "assistant", content=f"m{i}")
        for i in range(MAX_HISTORY_MESSAGES + 1)
    ]
    with pytest.raises(ValidationError):
        ChatRequest(question="Next?", language="en", history=history)


def test_chat_request_rejects_overlong_history_content() -> None:
    with pytest.raises(ValidationError):
        HistoryMessage(role="user", content="x" * (MAX_HISTORY_CONTENT_LENGTH + 1))


def test_feedback_request_schema_rating_enum() -> None:
    ok = FeedbackRequest(query_id="q1", rating="up", comment=None)
    assert ok.rating == "up"
    with pytest.raises(ValidationError):
        FeedbackRequest(query_id="q1", rating="sideways")  # type: ignore[arg-type]


def test_minimal_chat_response_has_required_query_id(
    client: TestClient, repository: ChatRepository
) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "How much is tuition?", "language": "en", "history": []},
    )
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body["answer"], str) and body["answer"].strip()
    assert isinstance(body["sources"], list)
    assert isinstance(body["query_id"], str) and body["query_id"].strip()
    assert body["confidence"] is None or (0.0 <= body["confidence"] <= 1.0)
    assert body["latency_ms"] is None or body["latency_ms"] >= 0
    assert repository.get_query_log(body["query_id"]) is not None


def test_feedback_response_contract_shape(
    client: TestClient, repository: ChatRepository
) -> None:
    chat = client.post(
        "/api/chat",
        json={"question": "How do I apply?", "language": "en"},
    ).json()
    response = client.post(
        "/api/feedback",
        json={"query_id": chat["query_id"], "rating": "down", "comment": None},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["feedback_id"], str) and body["feedback_id"].strip()
    assert repository.get_feedback_for_query(chat["query_id"]) is not None
