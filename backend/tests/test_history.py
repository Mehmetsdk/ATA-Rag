"""History helper tests."""

from __future__ import annotations

from app.schemas import ChatMessage
from app.services.history import build_retrieval_query


def test_retrieval_query_uses_user_history_not_assistant_facts() -> None:
    query = build_retrieval_query(
        "What about part-time studies?",
        [
            ChatMessage(role="user", content="How much is Computer Science tuition?"),
            ChatMessage(
                role="assistant",
                content="Tuition is 5000 PLN per semester according to outdated demo data.",
            ),
        ],
    )
    assert "Computer Science tuition" in query
    assert "5000 PLN" not in query
    assert "part-time studies" in query


def test_retrieval_query_without_history_is_current_question() -> None:
    assert build_retrieval_query("Hello?", []) == "Hello?"
