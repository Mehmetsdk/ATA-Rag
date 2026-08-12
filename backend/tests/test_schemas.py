"""Schema contract validation tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import MAX_HISTORY_CONTENT_LENGTH, MAX_HISTORY_MESSAGES
from app.schemas import ChatMessage, ChatRequest, FeedbackRequest


def test_minimal_chat_request() -> None:
    payload = ChatRequest(question="Hello?", language="en")
    assert payload.history == []


def test_chat_request_with_valid_history() -> None:
    payload = ChatRequest(
        question="Follow-up?",
        language="en",
        history=[
            ChatMessage(role="user", content="Tuition?"),
            ChatMessage(role="assistant", content="See fee schedule."),
        ],
    )
    assert len(payload.history) == 2


def test_chat_rejects_invalid_history_role() -> None:
    with pytest.raises(ValidationError):
        ChatRequest.model_validate(
            {
                "question": "Hi",
                "language": "en",
                "history": [{"role": "system", "content": "nope"}],
            }
        )


def test_chat_rejects_over_limit_history() -> None:
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"m{i}"}
        for i in range(MAX_HISTORY_MESSAGES + 1)
    ]
    with pytest.raises(ValidationError):
        ChatRequest.model_validate(
            {"question": "Next?", "language": "en", "history": history}
        )


def test_chat_rejects_overlong_history_content() -> None:
    with pytest.raises(ValidationError):
        ChatMessage(role="user", content="x" * (MAX_HISTORY_CONTENT_LENGTH + 1))


def test_feedback_accepts_up_and_down() -> None:
    assert FeedbackRequest(query_id="abc", rating="up").rating == "up"
    assert FeedbackRequest(query_id="abc", rating="down").rating == "down"


def test_feedback_rejects_invalid_rating() -> None:
    with pytest.raises(ValidationError):
        FeedbackRequest.model_validate({"query_id": "abc", "rating": "sideways"})
