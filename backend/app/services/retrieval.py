"""pgvector retrieval service."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Chunk, Document
from app.services.embeddings import embed_text


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    text: str
    title: str | None
    url: str | None
    section: str | None
    source_type: str | None
    score: float


def score_from_cosine_distance(distance: float) -> float:
    """Map pgvector cosine distance to a 0–1 similarity score."""
    return max(0.0, min(1.0, 1.0 - float(distance)))


def passes_retrieval_threshold(score: float, min_score: float) -> bool:
    return score >= min_score


async def retrieve_similar_chunks(
    session: AsyncSession,
    query_text: str,
    *,
    top_k: int | None = None,
    min_score: float | None = None,
) -> list[RetrievedChunk]:
    """
    Vector similarity search over indexed university chunks.

    Returns an empty list when embeddings are unavailable, the index is empty,
    or no chunk meets RETRIEVAL_MIN_SCORE.
    """
    settings = get_settings()
    limit = top_k or settings.retrieval_top_k
    threshold = settings.retrieval_min_score if min_score is None else min_score

    try:
        query_embedding = await embed_text(query_text)
    except RuntimeError:
        return []

    distance = Chunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(Chunk, Document, distance.label("distance"))
        .outerjoin(Document, Chunk.document_id == Document.id)
        .where(Chunk.embedding.is_not(None))
        .order_by(distance)
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows = result.all()

    retrieved: list[RetrievedChunk] = []
    for chunk, document, dist in rows:
        score = score_from_cosine_distance(dist)
        if not passes_retrieval_threshold(score, threshold):
            continue

        metadata = chunk.metadata_ or {}
        retrieved.append(
            RetrievedChunk(
                chunk_id=str(chunk.id),
                text=chunk.chunk,
                title=(document.title if document else None) or metadata.get("title"),
                url=(document.url if document else None) or metadata.get("url"),
                section=metadata.get("section"),
                source_type=metadata.get("source") or metadata.get("source_type"),
                score=score,
            )
        )
    return retrieved
