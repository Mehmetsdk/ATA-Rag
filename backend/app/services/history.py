"""Bounded conversation history helpers for retrieval query building."""

from __future__ import annotations

import re

from app.schemas import ChatMessage

# Signals that the question likely depends on prior context to be understood
# on its own (pronouns, or very short questions like "what about tuition?").
_ANAPHORA_PATTERN = re.compile(
    r"\b(it|its|that|this|those|these|they|them|he|she|his|her)\b",
    re.IGNORECASE,
)
_SHORT_QUESTION_WORD_THRESHOLD = 4


def _needs_context(question: str) -> bool:
    stripped = question.strip()
    if not stripped:
        return False
    if _ANAPHORA_PATTERN.search(stripped):
        return True
    word_count = len(stripped.split())
    return word_count <= _SHORT_QUESTION_WORD_THRESHOLD


def build_retrieval_query(question: str, history: list[ChatMessage]) -> str:
    """
    Build a context-aware retrieval query from the current question and prior turns.

    Assistant answers are NOT treated as factual sources — only user turns provide
    follow-up context (e.g. prior topic: tuition → follow-up: part-time studies).

    History is only blended in when the current question looks like it depends on
    prior context (short questions, or ones using pronouns like "it"/"that").
    A question that already stands on its own is searched as-is, so unrelated
    earlier turns don't dilute the embedding and drag down retrieval scores.
    """
    stripped_question = question.strip()

    if not _needs_context(stripped_question):
        return stripped_question

    user_turns = [message.content.strip() for message in history if message.role == "user"]
    user_turns = [text for text in user_turns if text]

    if not user_turns:
        return stripped_question

    # Keep the most recent user context plus the current question.
    context = " ".join(user_turns[-3:])
    return f"{context} {stripped_question}".strip()