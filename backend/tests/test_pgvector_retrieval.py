"""Deterministic pgvector retrieval integration (no OpenAI network)."""

from __future__ import annotations

import pytest

from app.config import get_embedding_dimensions, get_settings
from app.models import Chunk, Document
from app.services import retrieval as retrieval_module


def _basis_vector(index: int, dimensions: int, magnitude: float = 1.0) -> list[float]:
    vector = [0.0] * dimensions
    vector[index] = magnitude
    return vector


@pytest.mark.integration
@pytest.mark.asyncio
async def test_pgvector_retrieval_orders_by_nearest_neighbor(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dim = get_embedding_dimensions()

    async def stub_embed(_: str) -> list[float]:
        return _basis_vector(0, dim)

    monkeypatch.setattr(retrieval_module, "embed_text", stub_embed)
    monkeypatch.setenv("RETRIEVAL_MIN_SCORE", "0.35")
    get_settings.cache_clear()

    doc = Document(
        url="https://akademiata.pl/tuition",
        title="Tuition page",
    )
    db_session.add(doc)
    await db_session.flush()

    nearer = Chunk(
        document_id=doc.id,
        chunk="Computer Science tuition fees",
        embedding=_basis_vector(0, dim),
        metadata_={"section": "Fees", "source": "website"},
    )
    farther = Chunk(
        document_id=doc.id,
        chunk="Unrelated cafeteria menu",
        embedding=_basis_vector(1, dim),
        metadata_={"section": "Other", "source": "website"},
    )
    db_session.add_all([nearer, farther])
    await db_session.flush()

    results = await retrieval_module.retrieve_similar_chunks(
        db_session,
        "Computer Science tuition",
        min_score=0.35,
    )

    assert len(results) >= 1
    assert results[0].text == "Computer Science tuition fees"
    assert results[0].url == "https://akademiata.pl/tuition"
    assert results[0].section == "Fees"
    assert results[0].source_type == "website"
    assert results[0].score >= 0.35
    if len(results) > 1:
        assert results[0].score >= results[1].score


@pytest.mark.integration
@pytest.mark.asyncio
async def test_pgvector_retrieval_excludes_below_min_score(
    db_session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    dim = get_embedding_dimensions()

    async def stub_embed(_: str) -> list[float]:
        return _basis_vector(0, dim)

    monkeypatch.setattr(retrieval_module, "embed_text", stub_embed)
    monkeypatch.setenv("RETRIEVAL_MIN_SCORE", "0.99")
    get_settings.cache_clear()

    doc = Document(url="https://akademiata.pl/a", title="A")
    db_session.add(doc)
    await db_session.flush()

    # Orthogonal to query vector → cosine distance 1.0 → score 0.0
    db_session.add(
        Chunk(
            document_id=doc.id,
            chunk="Orthogonal content",
            embedding=_basis_vector(1, dim),
        )
    )
    await db_session.flush()

    results = await retrieval_module.retrieve_similar_chunks(
        db_session,
        "query",
        min_score=0.99,
    )
    assert results == []
