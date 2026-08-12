"""Application settings (pydantic-settings)."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Conversation history limits (mirrored by frontend — CONTRACTS.md §3.1).
MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_CONTENT_LENGTH = 2000
MAX_QUESTION_LENGTH = 1500

# Canonical pgvector column width — must match EMBEDDING_DIMENSIONS and OpenAI requests.
DEFAULT_EMBEDDING_DIMENSIONS = 1536


def parse_cors_origins(raw: str | None) -> list[str]:
    """
    Parse comma-separated CORS origins.

    Trims whitespace, ignores empty entries, never returns wildcard.
    """
    if not raw:
        return []
    origins: list[str] = []
    for part in raw.split(","):
        trimmed = part.strip()
        if not trimmed or trimmed == "*":
            continue
        origins.append(trimmed.rstrip("/"))
    return origins


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/atarag",
        alias="DATABASE_URL",
    )
    cors_origins: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
    )
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    embedding_model: str = Field(default="text-embedding-3-small", alias="EMBEDDING_MODEL")
    embedding_dimensions: int = Field(
        default=DEFAULT_EMBEDDING_DIMENSIONS,
        alias="EMBEDDING_DIMENSIONS",
    )
    chat_model: str = Field(default="gpt-4o-mini", alias="CHAT_MODEL")
    retrieval_top_k: int = Field(default=5, alias="RETRIEVAL_TOP_K")
    retrieval_min_score: float = Field(default=0.35, alias="RETRIEVAL_MIN_SCORE")

    @field_validator("embedding_dimensions")
    @classmethod
    def embedding_dimensions_positive(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("EMBEDDING_DIMENSIONS must be a positive integer")
        return value

    @field_validator("retrieval_min_score")
    @classmethod
    def retrieval_min_score_in_range(cls, value: float) -> float:
        if value < 0.0 or value > 1.0:
            raise ValueError("RETRIEVAL_MIN_SCORE must be between 0.0 and 1.0")
        return value

    @property
    def allowed_origins(self) -> list[str]:
        return parse_cors_origins(self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_embedding_dimensions() -> int:
    """Dimension used by pgvector columns and embedding API requests."""
    return get_settings().embedding_dimensions
