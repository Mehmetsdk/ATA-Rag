"""Pydantic request/response schemas for CONTRACTS.md §3."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.config import MAX_HISTORY_CONTENT_LENGTH, MAX_HISTORY_MESSAGES, MAX_QUESTION_LENGTH


class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

    @field_validator("content")
    @classmethod
    def content_limits(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("content must not be blank")
        if len(trimmed) > MAX_HISTORY_CONTENT_LENGTH:
            raise ValueError(
                f"content must be at most {MAX_HISTORY_CONTENT_LENGTH} characters"
            )
        return trimmed


class ChatRequest(BaseModel):
    question: str
    language: str = "en"
    history: list[HistoryMessage] = Field(default_factory=list)

    @field_validator("question")
    @classmethod
    def question_limits(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("question must not be blank")
        if len(trimmed) > MAX_QUESTION_LENGTH:
            raise ValueError(f"question must be at most {MAX_QUESTION_LENGTH} characters")
        return trimmed

    @field_validator("language")
    @classmethod
    def language_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("language must not be blank")
        return trimmed

    @field_validator("history")
    @classmethod
    def history_length(cls, value: list[HistoryMessage]) -> list[HistoryMessage]:
        if len(value) > MAX_HISTORY_MESSAGES:
            raise ValueError(
                f"history must contain at most {MAX_HISTORY_MESSAGES} messages"
            )
        return value


class SourceReference(BaseModel):
    title: str
    url: str
    section: str | None = None
    excerpt: str | None = None
    source_type: str | None = None


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceReference]
    confidence: float | None = None
    latency_ms: int | None = None
    query_id: str


class FeedbackRequest(BaseModel):
    query_id: str
    rating: Literal["up", "down"]
    comment: str | None = None

    @field_validator("query_id")
    @classmethod
    def query_id_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("query_id must not be blank")
        return trimmed

    @field_validator("comment")
    @classmethod
    def normalize_comment(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        return trimmed if trimmed else None


class FeedbackResponse(BaseModel):
    success: bool
    feedback_id: str
