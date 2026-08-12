"""Embedding generation for vector retrieval."""

from __future__ import annotations

from openai import AsyncOpenAI

from app.config import get_embedding_dimensions, get_settings


async def embed_text(text: str) -> list[float]:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is required for embedding retrieval")

    dimensions = get_embedding_dimensions()
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text,
        dimensions=dimensions,
    )
    vector = response.data[0].embedding
    if len(vector) != dimensions:
        raise RuntimeError(
            f"Embedding API returned dimension {len(vector)}, expected {dimensions}. "
            "Align EMBEDDING_MODEL and EMBEDDING_DIMENSIONS with the database schema."
        )
    return vector
