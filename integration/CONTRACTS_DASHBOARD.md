# PROPOSED CONTRACT — Dashboard Admin API

> **Status:** PROPOSED CONTRACT — for team discussion only.
> This document does **not** modify [CONTRACTS.md](../../CONTRACTS.md) (repository root).
> Person 2 (Backend) must review and implement before production use.

## Overview

The operations dashboard needs read-only admin endpoints for crawl and usage metrics.
These endpoints are separate from the public chat API.

Base path prefix: `/api/admin`

Authentication is **out of scope** for MVP. Production deployments should add auth before exposing admin routes.

---

## GET /api/admin/stats

Aggregate metrics for the dashboard overview.

### Response

```json
{
  "total_documents": 142,
  "total_chunks": 1847,
  "crawl_status": "idle",
  "failed_pages": 3,
  "last_crawl_at": "2026-08-05T14:30:00Z",
  "total_questions": 523,
  "avg_response_time_ms": 1240,
  "unanswered_questions": 12
}
```

| Field | Type | Description |
|---|---|---|
| `total_documents` | integer | Rows in `documents` table |
| `total_chunks` | integer | Rows in `chunks` table |
| `crawl_status` | `"idle"` \| `"running"` \| `"failed"` \| `"completed"` | Current crawl state |
| `failed_pages` | integer | Pages that failed during the last crawl |
| `last_crawl_at` | ISO 8601 string \| null | Timestamp of last completed crawl |
| `total_questions` | integer | Total chat questions logged |
| `avg_response_time_ms` | number | Mean response latency |
| `unanswered_questions` | integer | Questions with no grounded answer |

---

## GET /api/admin/crawl-history

Recent crawl runs, newest first.

### Query parameters (optional)

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 10 | Max entries to return |

### Response

```json
[
  {
    "id": "crawl-2026-08-05",
    "started_at": "2026-08-05T12:00:00Z",
    "finished_at": "2026-08-05T14:30:00Z",
    "status": "completed",
    "pages_crawled": 287,
    "pages_failed": 3,
    "chunks_produced": 1847
  }
]
```

---

## GET /api/admin/recent-questions

Recent user questions, newest first.

### Query parameters (optional)

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | 20 | Max entries to return |

### Response

```json
[
  {
    "id": "q-001",
    "question": "How much is Computer Science tuition?",
    "asked_at": "2026-08-06T10:22:00Z",
    "answered": true,
    "response_time_ms": 1180,
    "confidence": 0.91
  }
]
```

---

## GET /health

Service health check for Docker and Coolify.

### Response

```json
{
  "service_name": "ata-rag-backend",
  "status": "healthy",
  "checks": [
    { "name": "postgres", "status": "healthy", "detail": null }
  ]
}
```

HTTP status: `200` when healthy, `503` when unhealthy.

---

## GET /metrics

JSON metrics snapshot from the observability registry.

### Response

```json
{
  "counters": {
    "http_requests_total": 1523,
    "queries_total": 523
  },
  "durations": {
    "http_request_duration_ms": {
      "count": 100,
      "avg_ms": 45.2,
      "min_ms": 1.1,
      "max_ms": 890.0
    }
  },
  "generated_at": 1722950400.0
}
```

---

## Frontend mapping

The dashboard frontend (`dashboard/src/lib/api/dashboard-mapper.ts`) converts snake_case responses to camelCase TypeScript types.

## Mock implementation

Until Person 2 implements these endpoints, use:

- **In-browser mock:** `NEXT_PUBLIC_USE_MOCK_DASHBOARD=true`
- **Mock server:** `integration/mock_server.py` (Docker service `mock-api`)

Both mock implementations are marked with TODO comments for replacement.
