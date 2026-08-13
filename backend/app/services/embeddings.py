import os
from typing import List

from openai import AsyncOpenAI

from app.config import settings


def _openai_client() -> AsyncOpenAI:
    if not settings.OPENAI_API_KEY:
        raise ValueError(
            "OPENAI_API_KEY is not configured. Please add it to your .env before running ingestion."
        )

    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def create_embeddings(texts: List[str]) -> List[List[float]]:
    """Create embeddings for a batch of texts using OpenAI.

    Args:
        texts: A list of strings to embed.

    Returns:
        A list of embedding vectors, one per input text.
    """
    if not texts:
        return []

    client = _openai_client()
    model_name = getattr(settings, 'EMBEDDING_MODEL', 'text-embedding-3-small')
    response = await client.embeddings.create(
        model=model_name,
        input=texts,
    )

    return [item.embedding for item in response.data]
