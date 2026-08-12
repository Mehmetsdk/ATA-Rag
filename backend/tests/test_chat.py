"""Unit tests for grounded no-answer chat behavior."""

from __future__ import annotations

import pytest

from app.schemas import ChatRequest
from app.services.chat import NO_VERIFIED_ANSWER, default_answer_generator


@pytest.mark.asyncio
async def test_empty_retrieval_returns_transparent_no_answer() -> None:
    result = await default_answer_generator(
        ChatRequest(question="Unknown topic?", language="en"),
        retrieval_query="Unknown topic?",
        chunks=[],
    )
    assert result.answer == NO_VERIFIED_ANSWER
    assert result.sources == []
    assert result.confidence is None


@pytest.mark.asyncio
async def test_chunks_without_urls_produce_no_fake_sources() -> None:
    from app.services.retrieval import RetrievedChunk

    result = await default_answer_generator(
        ChatRequest(question="Q", language="en"),
        "Q",
        [
            RetrievedChunk(
                chunk_id="1",
                text="Some text",
                title="Title",
                url=None,
                section=None,
                source_type="website",
                score=0.9,
            )
        ],
    )
    assert result.sources == []
    assert result.confidence is None
    assert result.answer == NO_VERIFIED_ANSWER
