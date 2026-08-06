"""
FastAPI HTTP surface for CONTRACTS.md §3.

Retrieval / LLM answering is not implemented on this branch. See chat_service.py
for the integration boundary. Query logs and feedback are persisted through
ChatRepository (SQLite by default).
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.chat_service import handle_chat
from app.feedback_service import UnknownQueryError, handle_feedback
from app.repository import get_repository
from app.schemas import ChatRequest, ChatResponse, FeedbackRequest, FeedbackResponse

app = FastAPI(
    title="ATA-Rag API",
    version="0.2.0",
    description=(
        "Chat + feedback contract API. Query logs and feedback persist via "
        "ChatRepository. Vector RAG retrieval is not wired in this package."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    return handle_chat(request, get_repository())


@app.post("/api/feedback", response_model=FeedbackResponse)
def feedback(request: FeedbackRequest) -> FeedbackResponse:
    try:
        return handle_feedback(request, get_repository())
    except UnknownQueryError:
        raise HTTPException(status_code=404, detail="Unknown query_id") from None
