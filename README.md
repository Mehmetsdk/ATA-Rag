# ATA-Rag

A RAG-based university assistant for [akademiata.pl](https://akademiata.pl) (Akademia Techniczno-Artystyczna). Students and applicants ask natural-language questions about admissions, tuition, programmes, contacts, etc.; the system generates answers grounded only in the site's real content, with sources cited.

## How it works

```
akademiata.pl
      │
  Scraper (Python)                          scraper/
      │  HTML → clean Markdown → heading-based chunks
      ▼
scraper/data/chunks.jsonl
      │
  Embedding (OpenAI) + ingestion
      ▼
PostgreSQL + pgvector (Supabase)
      │
      ▼
FastAPI backend                             backend/
      │  question → embed → pgvector similarity search
      │  → LLM produces a grounded answer in the question's
      │    language, synthesized from (mostly Polish) sources
      │  → query_logs + answer_feedback persisted
      ▼
Next.js frontend (chat + /dashboard)         frontend/
      │
    User
```

The source site's content is mostly **Polish**; the backend answers in whatever language the question was asked in (English/Polish), synthesizing from the Polish source material.

## Repo layout

| Folder | Contents |
|---|---|
| `scraper/` | Web crawler, HTML→Markdown, heading-based chunking, PDF extraction |
| `backend/` | FastAPI: `/api/chat`, `/api/feedback`, `/api/dashboard/stats`, pgvector retrieval, LLM answer generation |
| `frontend/` | Next.js chat interface + `/dashboard` route (integrated) |
| `dashboard/` | Original source of the dashboard components (now moved into `frontend/src/app/dashboard`) |
| `observability/` | Optional metrics/logging package for the backend (see Known gaps) |
| `integration/` | Dashboard API contract (`CONTRACTS_DASHBOARD.md`), temporary mock server |
| `coolify/` | Coolify deployment documentation |
| `docker-compose.yml` / `docker-compose.prod.yml` | Service orchestration (see Known gaps) |

Cross-team contracts (chunk format, DB schema, the `/api/chat` and `/api/feedback` contract) live in **[CONTRACTS.md](CONTRACTS.md)**.

## Quick start (local development)

**1. Scraper — collect data**
```bash
cd scraper
pip install -r requirements.txt
python main.py --mode live        # real domain: config.py > BASE_URL
```
Output: `scraper/data/chunks.jsonl`

**2. Backend — DB + RAG**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env           # fill in DATABASE_URL (Postgres+pgvector), OPENAI_API_KEY
uvicorn app.main:app --reload --port 8000
```
On first startup, `CREATE EXTENSION IF NOT EXISTS vector` and the tables are created automatically. Embedding `chunks.jsonl` and loading it into the DB is a separate ingestion step (see `backend/README.md`).

**3. Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                       # http://localhost:3000
```
Set `NEXT_PUBLIC_USE_MOCK_API=false` + `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` to connect to the real backend; `true` runs on mock data.

Each service has more detail in its own README: [`scraper/README.md`](scraper/README.md), [`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

## Tests

```bash
cd scraper  && pip install -r requirements-dev.txt && pytest
cd backend  && TEST_DATABASE_URL=<postgres-url> python -m pytest -q   # DB tests need a real Postgres
cd frontend && npm test
```

## Deployment

Coolify deployment instructions: [coolify/DEPLOYMENT.md](coolify/DEPLOYMENT.md).

**Before deploying**, see "Known gaps" below: `backend`/`frontend` services are still commented out in `docker-compose.yml`, and there's no `frontend/Dockerfile` yet — the deployment doc is ready, but the real services aren't wired into the compose file yet.

## Known gaps / TODO

- `docker-compose.yml`: the `backend` and `frontend` services are still disabled (commented out); only the temporary `mock-api` is active. These need to be enabled before a real Coolify deploy.
- No `frontend/Dockerfile` yet (`backend/Dockerfile` exists).
- The `observability/` package is ready but not yet wired into the backend (no `/health`/`/metrics` middleware integration).
- Some tuition/price figures are rendered dynamically via JS on the site (behind a "SPRAWDŹ CENNIK" button), so plain-HTML scraping can't capture them — handled separately via a dynamic-render script (`backend/fetch_dynamic_prices.py`).
- The scraper's `INCLUDE_KEYWORDS` list occasionally needs recalibrating against the live site menu.

## Team

| Area | Scope |
|---|---|
| Crawler & Data Collection | Site/PDF crawling, cleanup, chunking |
| Backend & RAG | FastAPI, pgvector, embeddings, LLM integration |
| Frontend | Next.js chat interface + dashboard |
| Dashboard & Deployment | Admin panel, Docker, Coolify |
| Test & QA | End-to-end testing, accuracy/performance checks
