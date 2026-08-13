"""Chat orchestration — RAG retrieval, answer generation, query logging."""

from __future__ import annotations

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


async def llm_answer_generator(
    request: ChatRequest,
    retrieval_query: str,
    chunks: list[RetrievedChunk],
) -> ChatGenerationResult:
    """Grounded answer via LLM. Reads (often Polish) sources, answers in the user's language."""
    if not chunks:
        return ChatGenerationResult(answer=NO_VERIFIED_ANSWER, sources=[], confidence=None)

    sources = _chunks_to_sources(chunks)
    if not sources:
        return ChatGenerationResult(answer=NO_VERIFIED_ANSWER, sources=[], confidence=None)

    settings = get_settings()
    if not settings.openai_api_key:
        # No LLM key available — fall back to the excerpt template.
        return await default_answer_generator(request, retrieval_query, chunks)

    lang_name = _LANG_NAMES.get(request.language, "English")
    blocks = []
    for i, c in enumerate(chunks[:5], start=1):
        header = " > ".join(x for x in [c.title, c.section] if x)
        blocks.append(f"[{i}] {header}\n{c.text[:700]}")
    context = "\n\n".join(blocks)

    system = (
        "You are the assistant for Akademia Techniczno-Artystyczna (ATA), a Polish university. "
        "Answer the user's question using ONLY the provided context excerpts from the university "
        f"website. The context is often written in Polish, but you MUST always answer in {lang_name}. "
        "Be concise and factual. If the context does not contain the answer, say you could not find it "
        "in the university sources. Never invent details."
    )
    user = f"Question: {request.question}\n\nContext:\n{context}"

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    try:
        resp = await client.chat.completions.create(
            model=settings.chat_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.2,
        )
        answer = (resp.choices[0].message.content or "").strip()
    except Exception:
        return await default_answer_generator(request, retrieval_query, chunks)

    if not answer:
        return await default_answer_generator(request, retrieval_query, chunks)

    return ChatGenerationResult(
        answer=answer,
        sources=sources,
        confidence=_confidence_from_chunks(chunks),
    )


async def handle_chat(
    request: ChatRequest,
    session: AsyncSession,
    *,
    answer_generator: AnswerGenerator = llm_answer_generator,
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
