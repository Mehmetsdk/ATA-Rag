"""Retrieval scoring and threshold tests."""

from __future__ import annotations

import pytest

from app.services.retrieval import (
    passes_retrieval_threshold,
    score_from_cosine_distance,
)


def test_score_from_cosine_distance_identical_vectors() -> None:
    assert score_from_cosine_distance(0.0) == 1.0


def test_score_from_cosine_distance_orthogonal_vectors() -> None:
    assert score_from_cosine_distance(1.0) == 0.0


def test_passes_retrieval_threshold_filters_weak_matches() -> None:
    assert passes_retrieval_threshold(0.9, 0.35) is True
    assert passes_retrieval_threshold(0.34, 0.35) is False
    assert passes_retrieval_threshold(0.35, 0.35) is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_retrieve_filters_below_min_score(db_session, monkeypatch) -> None:
    """Integration: weak vectors are excluded by RETRIEVAL_MIN_SCORE."""
    from app.config import get_embedding_dimensions, get_settings
    from app.models import Chunk, Document
    from app.services import retrieval as retrieval_module

    dim = get_embedding_dimensions()
    monkeypatch.setenv("RETRIEVAL_MIN_SCORE", "0.35")
    get_settings.cache_clear()

    async def stub_embed(_: str) -> list[float]:
        vec = [0.0] * dim
        vec[0] = 1.0
        return vec

    monkeypatch.setattr(retrieval_module, "embed_text", stub_embed)

    doc = Document(url="https://akademiata.pl/a", title="A")
    db_session.add(doc)
    await db_session.flush()

    strong = [0.0] * dim
    strong[0] = 1.0
    weak = [0.0] * dim
    weak[1] = 1.0

    db_session.add_all(
        [
            Chunk(document_id=doc.id, chunk="Strong match", embedding=strong),
            Chunk(document_id=doc.id, chunk="Weak match", embedding=weak),
        ]
    )
    await db_session.flush()

    results = await retrieval_module.retrieve_similar_chunks(
        db_session,
        "tuition",
        top_k=5,
        min_score=0.35,
    )
    assert len(results) == 1
    assert results[0].text == "Strong match"
    assert results[0].score >= 0.35
