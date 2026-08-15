"""Chat orchestration — RAG retrieval, answer generation, query logging."""

from __future__ import annotations

import time
from typing import Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import QueryLog
from app.schemas import ChatRequest, ChatResponse, Source
from app.services.history import build_retrieval_query
from app.services.retrieval import RetrievedChunk, retrieve_similar_chunks

NO_VERIFIED_ANSWER = (
    "I couldn't find enough verified information in the indexed university sources "
    "to answer this question."
)


class ChatGenerationResult:
    __slots__ = ("answer", "sources", "confidence")

    def __init__(
        self,
        answer: str,
        sources: list[Source],
        confidence: float | None,
    ) -> None:
        self.answer = answer
        self.sources = sources
        self.confidence = confidence


class AnswerGenerator(Protocol):
    async def generate(
        self,
        request: ChatRequest,
        retrieval_query: str,
        chunks: list[RetrievedChunk],
    ) -> ChatGenerationResult: ...


def _chunks_to_sources(chunks: list[RetrievedChunk]) -> list[Source]:
    sources: list[Source] = []
    seen_urls: set[str] = set()
    for item in chunks:
        if not item.url:
            continue
        key = item.url.rstrip("/").lower()
        if key in seen_urls:
            continue
        seen_urls.add(key)
        sources.append(
            Source(
                title=item.title or "University source",
                url=item.url,
                section=item.section,
                excerpt=item.text[:280] if item.text else None,
                source_type=item.source_type or "website",
            )
        )
    return sources


def _confidence_from_chunks(chunks: list[RetrievedChunk]) -> float | None:
    if not chunks:
        return None
    return max(0.0, min(1.0, chunks[0].score))


async def default_answer_generator(
    request: ChatRequest,
    retrieval_query: str,
    chunks: list[RetrievedChunk],
) -> ChatGenerationResult:
    """Generate a grounded answer from retrieved chunks only."""
    if not chunks:
        return ChatGenerationResult(
            answer=NO_VERIFIED_ANSWER,
            sources=[],
            confidence=None,
        )

    sources = _chunks_to_sources(chunks)
    if not sources:
        return ChatGenerationResult(
            answer=NO_VERIFIED_ANSWER,
            sources=[],
            confidence=None,
        )

    excerpt = chunks[0].text[:400]
    answer = (
        f"Based on indexed university sources for “{request.question}”: "
        f"{excerpt}… Review the linked sources for full details."
    )
    return ChatGenerationResult(
        answer=answer,
        sources=sources,
        confidence=_confidence_from_chunks(chunks),
    )


async def handle_chat(
    request: ChatRequest,
    session: AsyncSession,
    *,
    answer_generator: AnswerGenerator = default_answer_generator,
) -> ChatResponse:
    started = time.perf_counter()

    retrieval_query = build_retrieval_query(request.question, request.history)
    chunks = await retrieve_similar_chunks(session, retrieval_query)
    generated = await answer_generator(request, retrieval_query, chunks)

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))

    query_log = QueryLog(
        question=request.question,
        language=request.language,
        answer=generated.answer,
        confidence=generated.confidence,
        latency_ms=latency_ms,
    )
    session.add(query_log)
    await session.flush()

    return ChatResponse(
        answer=generated.answer,
        sources=generated.sources,
        confidence=generated.confidence,
        latency_ms=latency_ms,
        query_id=str(query_log.id),
    )
