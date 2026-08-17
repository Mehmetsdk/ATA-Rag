"""Chat orchestration — RAG retrieval, answer generation, query logging."""

from __future__ import annotations

import logging
import time
from typing import Protocol

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import QueryLog
from app.schemas import ChatRequest, ChatResponse, Source
from app.services.history import build_retrieval_query
from app.services.retrieval import RetrievedChunk, retrieve_similar_chunks

_LANG_NAMES = {"en": "English", "pl": "Polish"}

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
    # Build a concise context from the top nearby chunks (3-5 if available).
    if len(chunks) >= 3:
        take = min(5, len(chunks))
    else:
        take = len(chunks)

    context_parts: list[str] = []
    for c in chunks[:take]:
        if c.text:
            context_parts.append(c.text.strip())
    context = "\n\n".join(context_parts)

    settings = get_settings()
    if not settings.openai_api_key:
        # If no API key configured, fallback to honest no-answer behavior.
        logging.warning("OPENAI_API_KEY not set; cannot call LLM for answer generation")
        return ChatGenerationResult(
            answer=NO_VERIFIED_ANSWER,
            sources=[],
            confidence=None,
        )

    lang_name = _LANG_NAMES.get(request.language, "English")
    system_prompt = (
        "You are a university assistant. ONLY answer based on the provided context. "
        f"The context may be written in Polish, but you MUST always answer in {lang_name} "
        "(the user's selected language) — never answer in the context's language instead. "
        "If the context does not contain the information, say you don't know. "
        "Never include markdown heading markers (#, ##, ###) in your answer — write plain, fluent text. "
        "Be short and concise. "
        "If you cannot answer from the context, respond with EXACTLY this phrase and nothing else: NO_ANSWER_FOUND"
    )

    user_prompt = f"Context:\n{context}\n\nQuestion: {request.question}"

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        resp = await client.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
        )
        assistant_message = resp.choices[0].message.content if resp.choices else None

        if not assistant_message:
            return ChatGenerationResult(
                answer=NO_VERIFIED_ANSWER,
                sources=[],
                confidence=None,
            )

        # If the model returns the sentinel, treat as no verified answer.
        if assistant_message.strip() == "NO_ANSWER_FOUND":
            return ChatGenerationResult(
                answer=NO_VERIFIED_ANSWER,
                sources=[],
                confidence=None,
            )

        answer_text = assistant_message
    except Exception as exc:  # network, rate-limit, etc.
        logging.exception("LLM call failed in default_answer_generator: %s", exc)
        return ChatGenerationResult(
            answer=NO_VERIFIED_ANSWER,
            sources=[],
            confidence=None,
        )

    return ChatGenerationResult(
        answer=answer_text,
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
