"""Bounded conversation history helpers for retrieval query building."""

from __future__ import annotations

from app.schemas import ChatMessage


def build_retrieval_query(question: str, history: list[ChatMessage]) -> str:
    """
    Build a context-aware retrieval query from the current question and prior turns.

    Assistant answers are NOT treated as factual sources — only user turns provide
    follow-up context (e.g. prior topic: tuition → follow-up: part-time studies).
    """
    user_turns = [message.content.strip() for message in history if message.role == "user"]
    user_turns = [text for text in user_turns if text]

    if not user_turns:
        return question.strip()

    # Keep the most recent user context plus the current question.
    context = " ".join(user_turns[-3:])
    return f"{context} {question.strip()}".strip()
