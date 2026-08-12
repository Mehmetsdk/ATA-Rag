# Mock Integration Layer

Temporary mock API for dashboard and health endpoints until Person 2 implements the real backend.

## Endpoints

See [CONTRACTS_DASHBOARD.md](./CONTRACTS_DASHBOARD.md) (PROPOSED CONTRACT).

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check |
| `GET /metrics` | Metrics snapshot |
| `GET /api/admin/stats` | Dashboard overview |
| `GET /api/admin/crawl-history` | Recent crawls |
| `GET /api/admin/recent-questions` | Recent questions |

All mock data is marked with `TODO (Person 2)` in `mock_server.py`.

## Local run

```bash
cd integration
pip install -r requirements.txt
python mock_server.py
```

Server listens on `http://localhost:8000`.

## Docker

Built and started via root `docker-compose.yml` as service `mock-api`.

## Frontend connection

In the Next.js frontend (after copying dashboard files):

```env
NEXT_PUBLIC_USE_MOCK_DASHBOARD=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Replacement plan

1. Person 2 implements the same endpoints in the real FastAPI backend.
2. Person 2 imports `observability/` for logging, metrics, and health checks.
3. Remove `mock-api` service from docker-compose.
4. Point frontend to the real backend URL.
