from pydantic import BaseModel, Field
from typing import Literal


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str
    language: str
    history: list[ChatMessage] = []


class Source(BaseModel):
    title: str
    url: str
    section: str
    excerpt: str
    source_type: Literal["website", "pdf"]


class ChatResponse(BaseModel):
    answer: str
    sources: list[Source]
    confidence: float = Field(ge=0.0, le=1.0)
    latency_ms: int