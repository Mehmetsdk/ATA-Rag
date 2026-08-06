# Coolify Deployment Guide

Person 4 (Infrastructure) — deployment documentation for ATA-RAG.

## Overview

Coolify deploys the ATA-RAG stack from this `infra/` directory using Docker Compose.
Teammate services (backend, frontend, scraper) are added as their Dockerfiles become available.

## Prerequisites

- Coolify instance with Docker Compose support
- Domain names configured (e.g. `chat.example.edu.pl`, `api.example.edu.pl`)
- PostgreSQL pgvector support (included via `pgvector/pgvector:pg16` image)

## Deployment steps

### 1. Copy infra into the repository

Copy the contents of Folder B into the repo's `infra/` directory:

```
infra/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── dashboard/
├── integration/
├── observability/
└── coolify/
```

### 2. Configure environment variables

In Coolify, set environment variables from `.env.example`:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` | Yes | Database user |
| `POSTGRES_PASSWORD` | Yes | Strong production password |
| `POSTGRES_DB` | Yes | Database name |
| `DATABASE_URL` | Yes | Full connection string for backend |
| `OPENAI_API_KEY` | Yes (backend) | LLM API key — backend only |
| `NEXT_PUBLIC_API_BASE_URL` | Yes (frontend) | Public API URL |
| `NEXT_PUBLIC_USE_MOCK_API` | Yes | `false` in production |
| `NEXT_PUBLIC_USE_MOCK_DASHBOARD` | Yes | `false` in production |
| `CORS_ORIGINS` | Yes | Frontend origin for CORS |
| `LOG_LEVEL` | No | Default `INFO` |

Never commit secrets. Set all sensitive values in the Coolify UI.

### 3. Deploy with Compose

In Coolify:

1. Create a new **Docker Compose** resource
2. Point to `infra/docker-compose.yml`
3. Add production override: `infra/docker-compose.prod.yml`
4. Set environment variables from step 2
5. Deploy

### 4. Health checks

Coolify uses Docker health checks defined in compose:

| Service | Endpoint | Expected |
|---|---|---|
| `postgres` | `pg_isready` | Exit 0 |
| `mock-api` | `GET /health` | HTTP 200, `"status": "healthy"` |
| `backend` (future) | `GET /health` | HTTP 200 |
| `frontend` (future) | HTTP GET on port 3000 | HTTP 200 |

### 5. Service startup order

```
postgres (healthy) → mock-api / backend → frontend
```

Coolify respects `depends_on` with health conditions in `docker-compose.yml`.

## Production checklist

- [ ] Replace `mock-api` with real backend (Person 2)
- [ ] Set `NEXT_PUBLIC_USE_MOCK_API=false`
- [ ] Set `NEXT_PUBLIC_USE_MOCK_DASHBOARD=false`
- [ ] Configure SSL/TLS via Coolify reverse proxy
- [ ] Do not expose PostgreSQL port publicly
- [ ] Add authentication to `/api/admin/*` routes before public deployment
- [ ] Person 3 deploys frontend with production build args
- [ ] Person 2 imports `observability/` package for logging and metrics

## Teammate Dockerfile requirements

When teammates add Dockerfiles, uncomment the corresponding services in `docker-compose.yml`.

| Service | Owner | Expected Dockerfile location |
|---|---|---|
| Backend | Person 2 | `backend/Dockerfile` |
| Frontend | Person 3 | `frontend/Dockerfile` |
| Scraper | Person 1 | `scraper/Dockerfile` (optional, scheduled) |

Person 4 does **not** create these Dockerfiles.

### Backend Dockerfile expectations (for Person 2)

```dockerfile
# Person 2 should:
# - Install observability: pip install -e ./observability
# - Expose port 8000
# - Implement GET /health using ata_observability.health.HealthChecker
# - Implement /api/admin/* per CONTRACTS_DASHBOARD.md
# - Implement POST /api/chat per CONTRACTS.md
```

### Frontend Dockerfile expectations (for Person 3)

```dockerfile
# Person 3 should:
# - Pass NEXT_PUBLIC_* as build args
# - Copy dashboard files from infra/dashboard/src/ into frontend/src/
# - Enable dashboard nav link in app-header.tsx
# - Expose port 3000
```

## Removing the mock API

When Person 2's backend is deployed:

1. Implement all endpoints from `integration/CONTRACTS_DASHBOARD.md`
2. Remove the `mock-api` service from `docker-compose.yml`
3. Update `NEXT_PUBLIC_API_BASE_URL` to point to the real backend
4. Delete or archive `integration/mock_server.py`

## Troubleshooting

| Issue | Fix |
|---|---|
| Dashboard shows "API not configured" | Set `NEXT_PUBLIC_API_BASE_URL` and restart frontend |
| CORS errors | Add frontend URL to `CORS_ORIGINS` on the API service |
| Postgres connection refused | Wait for health check; verify `DATABASE_URL` host is `postgres` |
| Mock data in production | Set `NEXT_PUBLIC_USE_MOCK_DASHBOARD=false` and rebuild frontend |
