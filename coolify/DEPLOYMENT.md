[DEPLOYMENT.md](https://github.com/user-attachments/files/30796696/DEPLOYMENT.md)
# Coolify Deployment Guide

Person 4 (Infrastructure) — deployment documentation for ATA-RAG.

## Overview

Coolify deploys the ATA-RAG stack from the **repository root** using Docker Compose.
Person 4's infrastructure files live alongside teammate directories (`scraper/`, `backend/`, `frontend/`).
Teammate services (backend, frontend, scraper) are added to compose as their Dockerfiles become available.

## Repository layout (Person 4)

Infrastructure files are committed at the repo root — there is no separate `infra/` folder:

```
ATA-Rag/                          # repository root
├── docker-compose.yml            # local dev stack
├── docker-compose.prod.yml       # production overrides
├── .env.example                  # unified env template
├── dashboard/                    # copy dashboard/src/ → frontend/src/
├── integration/                  # mock API + CONTRACTS_DASHBOARD.md
├── observability/                # Python observability package
├── coolify/
│   └── DEPLOYMENT.md             # this file
├── scraper/                      # Person 1
├── backend/                      # Person 2
└── frontend/                     # Person 3
```

## Prerequisites

- Coolify instance with Docker Compose support
- Domain names configured (e.g. `chat.example.edu.pl`, `api.example.edu.pl`)
- PostgreSQL pgvector support (included via `pgvector/pgvector:pg16` image)

## Deployment steps

### 1. Configure environment variables

In Coolify, set environment variables from `.env.example` at the repository root:

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

### 2. Deploy with Compose

In Coolify:

1. Create a new **Docker Compose** resource
2. Point to `docker-compose.yml` at the **repository root**
3. Add production override: `docker-compose.prod.yml` (same root)
4. Set environment variables from step 1
5. Deploy

### 3. Health checks

Coolify uses Docker health checks defined in compose:

| Service | Endpoint | Expected |
|---|---|---|
| `postgres` | `pg_isready` | Exit 0 |
| `mock-api` | `GET /health` | HTTP 200, `"status": "healthy"` |
| `backend` (future) | `GET /health` | HTTP 200 |
| `frontend` (future) | HTTP GET on port 3000 | HTTP 200 |

### 4. Service startup order

```
postgres (healthy) → mock-api / backend → frontend
```

Coolify respects `depends_on` with health conditions in `docker-compose.yml`.

## Production checklist

- [ ] Replace `mock-api` with real backend (Person 2)
- [ ] Set `NEXT_PUBLIC_USE_MOCK_API=false`
- [ ] Set `NEXT_PUBLIC_USE_MOCK_DASHBOARD=false`
- [ ] Configure SSL/TLS via Coolify reverse proxy
- [ ] Do not expose PostgreSQL port publicly (`docker-compose.prod.yml` removes the postgres port mapping)
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
# - Implement /api/admin/* per integration/CONTRACTS_DASHBOARD.md
# - Implement POST /api/chat per CONTRACTS.md
```

### Frontend Dockerfile expectations (for Person 3)

```dockerfile
# Person 3 should:
# - Pass NEXT_PUBLIC_* as build args
# - Copy dashboard files from dashboard/src/ into frontend/src/
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
| Coolify cannot find compose file | Ensure the resource points at repo-root `docker-compose.yml`, not a non-existent `infra/` path |
