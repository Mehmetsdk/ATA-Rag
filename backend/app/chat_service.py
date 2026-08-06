"""
Chat answering boundary.

This module intentionally does NOT implement pgvector retrieval or LLM generation.
Person 2 wires real RAG here later. Until then, successful /api/chat responses still
persist a query_log row and return a contract-compliant payload with query_id.
"""

from __future__ import annotations

import time

from app.repository import ChatRepository
from app.schemas import ChatRequest, ChatResponse, HistoryMessage, SourceReference


def build_placeholder_answer(question: str, history: list[HistoryMessage]) -> tuple[str, list[SourceReference], float]:
    """
    Placeholder answer text + fixed akademiata.pl citations.

    Integration boundary: replace this function with retrieval + LLM generation.
    Do not treat this as keyword search or embedding retrieval.
    """
    prior = len(history)
    history_note = (
        f" (conversation context: {prior} prior message{'s' if prior != 1 else ''})"
        if prior
        else ""
    )
    answer = (
        f"Indexed university sources are not retrieved by this API process yet"
        f"{history_note}. For “{question}”, consult the official akademiata.pl pages "
        "linked below, and contact the relevant university office for confirmation."
    )
    sources = [
        SourceReference(
            title="Admissions Overview",
            url="https://akademiata.pl/",
            section="How to apply",
            excerpt="Applicants submit an online application and required documents.",
            source_type="website",
        ),
        SourceReference(
            title="Tuition calculator",
            url="https://akademiata.pl/kalkulator-czesnego/",
            section="Fees",
            excerpt="Tuition varies by programme and study mode.",
            source_type="website",
        ),
    ]
    return answer, sources, 0.55


def handle_chat(request: ChatRequest, repository: ChatRepository) -> ChatResponse:
    started = time.perf_counter()
    answer, sources, confidence = build_placeholder_answer(request.question, request.history)
    latency_ms = max(1, int((time.perf_counter() - started) * 1000))

    log = repository.create_query_log(
        question=request.question,
        language=request.language,
        answer=answer,
        confidence=confidence,
        latency_ms=latency_ms,
    )

    return ChatResponse(
        answer=answer,
        sources=sources,
        confidence=confidence,
        latency_ms=latency_ms,
        query_id=log.id,
    )
