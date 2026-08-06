# ATA Observability

Reusable observability infrastructure for the ATA University RAG backend.

This package is **not** backend business logic. Person 2 (Backend) imports these utilities into the FastAPI application when ready.

## Installation

```bash
pip install -e ./observability
```

Or copy `ata_observability/` into the backend project.

Optional dependencies:

```bash
pip install -e "./observability[fastapi,postgres]"
```

## Usage

### Structured logging

```python
from ata_observability.logger import get_logger, log_error

logger = get_logger(__name__)
logger.info("Crawl started", extra={"crawl_id": "abc-123"})
log_error(logger, "Failed to fetch page", exc=exc, context={"url": url})
```

Logs are emitted as JSON lines (one object per line) for aggregation tools.

### Request duration middleware (FastAPI / ASGI)

```python
from fastapi import FastAPI
from ata_observability.middleware import RequestDurationMiddleware

app = FastAPI()
app.add_middleware(RequestDurationMiddleware)
```

Records `http_requests_total` counter and `http_request_duration_ms` duration metrics.

### Metrics registry

```python
from ata_observability.metrics import metrics

metrics.increment("queries_total")
metrics.record_duration("query_response_ms", 245.3)
snapshot = metrics.snapshot()
```

Expose via `GET /metrics` in the backend (see `integration/CONTRACTS_DASHBOARD.md`).

### Health checks

```python
import os
from ata_observability.health import HealthChecker, check_postgres

checker = HealthChecker(service_name="ata-rag-backend")
checker.register("postgres", check_postgres(os.environ["DATABASE_URL"]))
report = await checker.run()
```

Expose via `GET /health` — return HTTP 503 when `report.status != "healthy"`.

## Integration with backend (Person 2)

1. Add `observability/` to the backend repo (or install via pip).
2. Wire `RequestDurationMiddleware` in the FastAPI app.
3. Register health checks for PostgreSQL and any external dependencies.
4. Expose `/health` and `/metrics` endpoints.
5. Use `get_logger` across backend modules for structured logging.

## Files

| Module | Purpose |
|---|---|
| `logger.py` | JSON structured logging |
| `middleware.py` | ASGI request duration middleware |
| `metrics.py` | In-memory counters and duration registry |
| `health.py` | Async health check aggregator |
