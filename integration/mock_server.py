"""
TODO (Person 2): Replace this entire mock server with real FastAPI backend endpoints.

This standalone mock server provides dashboard admin endpoints and health checks
for local development and Docker Compose until the backend is ready.

See CONTRACTS_DASHBOARD.md (PROPOSED CONTRACT) for the API specification.
"""

from __future__ import annotations

import os
import time
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ATA-RAG Mock Integration API",
    description="TODO (Person 2): Temporary mock — replace with real backend.",
    version="0.1.0-mock",
)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# TODO (Person 2): Replace with database queries against documents/chunks tables.
MOCK_STATS: dict[str, Any] = {
    "total_documents": 142,
    "total_chunks": 1847,
    "crawl_status": "completed",
    "failed_pages": 3,
    "last_crawl_at": "2026-08-05T14:30:00Z",
    "total_questions": 523,
    "avg_response_time_ms": 1240,
    "unanswered_questions": 12,
}

# TODO (Person 2): Replace with crawl run history from database or scraper logs.
MOCK_CRAWL_HISTORY: list[dict[str, Any]] = [
    {
        "id": "crawl-2026-08-05",
        "started_at": "2026-08-05T12:00:00Z",
        "finished_at": "2026-08-05T14:30:00Z",
        "status": "completed",
        "pages_crawled": 287,
        "pages_failed": 3,
        "chunks_produced": 1847,
    },
    {
        "id": "crawl-2026-08-01",
        "started_at": "2026-08-01T09:15:00Z",
        "finished_at": "2026-08-01T11:45:00Z",
        "status": "completed",
        "pages_crawled": 265,
        "pages_failed": 5,
        "chunks_produced": 1720,
    },
    {
        "id": "crawl-2026-07-28",
        "started_at": "2026-07-28T08:00:00Z",
        "finished_at": "2026-07-28T08:02:00Z",
        "status": "failed",
        "pages_crawled": 12,
        "pages_failed": 12,
        "chunks_produced": 0,
    },
]

# TODO (Person 2): Replace with query logs from chat request history.
MOCK_RECENT_QUESTIONS: list[dict[str, Any]] = [
    {
        "id": "q-001",
        "question": "How much is Computer Science tuition?",
        "asked_at": "2026-08-06T10:22:00Z",
        "answered": True,
        "response_time_ms": 1180,
        "confidence": 0.91,
    },
    {
        "id": "q-002",
        "question": "What documents are required for admission?",
        "asked_at": "2026-08-06T09:55:00Z",
        "answered": True,
        "response_time_ms": 1420,
        "confidence": 0.87,
    },
    {
        "id": "q-003",
        "question": "Where is the dean's office?",
        "asked_at": "2026-08-06T09:30:00Z",
        "answered": True,
        "response_time_ms": 980,
        "confidence": 0.79,
    },
    {
        "id": "q-004",
        "question": "Can I transfer credits from another university?",
        "asked_at": "2026-08-06T08:45:00Z",
        "answered": False,
        "response_time_ms": None,
        "confidence": None,
    },
    {
        "id": "q-005",
        "question": "What scholarships are available for international students?",
        "asked_at": "2026-08-06T08:10:00Z",
        "answered": True,
        "response_time_ms": 1560,
        "confidence": 0.72,
    },
]

_request_count = 0


@app.get("/health")
async def health() -> dict[str, Any]:
    """Health check for Docker and Coolify."""
    return {
        "service_name": "ata-rag-mock-api",
        "status": "healthy",
        "checks": [
            {"name": "mock", "status": "healthy", "detail": "TODO (Person 2): wire real checks"},
        ],
    }


@app.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    """TODO (Person 2): Replace with ata_observability.metrics.snapshot()."""
    global _request_count
    return {
        "counters": {"http_requests_total": _request_count},
        "durations": {},
        "generated_at": time.time(),
    }


@app.get("/api/admin/stats")
async def admin_stats() -> dict[str, Any]:
    """TODO (Person 2): Query real stats from PostgreSQL."""
    global _request_count
    _request_count += 1
    return MOCK_STATS


@app.get("/api/admin/crawl-history")
async def crawl_history(limit: int = Query(default=10, ge=1, le=100)) -> list[dict[str, Any]]:
    """TODO (Person 2): Query real crawl history."""
    global _request_count
    _request_count += 1
    return MOCK_CRAWL_HISTORY[:limit]


@app.get("/api/admin/recent-questions")
async def recent_questions(limit: int = Query(default=20, ge=1, le=100)) -> list[dict[str, Any]]:
    """TODO (Person 2): Query real question logs."""
    global _request_count
    _request_count += 1
    return MOCK_RECENT_QUESTIONS[:limit]


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run("mock_server:app", host="0.0.0.0", port=port, reload=False)
