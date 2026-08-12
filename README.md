# ATA-Rag

akademiata.pl için RAG tabanlı üniversite chatbot'u.

## Ekip

| # | Kişi | Kapsam |
|---|------|--------|
| 1 | Mehmet | Crawler & Veri Toplama (`scraper/`) |
| 2 | Aysel | Backend & RAG (FastAPI, SQLAlchemy, PostgreSQL, pgvector) |
| 3 | Can | Frontend (Next.js chat arayüzü) |
| 4 | Sami | Dashboard, Observability, Docker/Coolify deployment |
| 5 | Alperen | Test & QA |

Ekipler arası arayüzler için [CONTRACTS.md](CONTRACTS.md).

## Klasör yapısı

```
scraper/    # Kişi 1
backend/    # Kişi 2 — POST /api/chat + POST /api/feedback
frontend/   # Kişi 3
infra/      # Kişi 4
```

## Hızlı doğrulama

```bash
# Frontend
cd frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build

# Backend unit tests (no PostgreSQL required)
cd backend && pip install -r requirements.txt && python -m pytest -q -m "not integration"

# Backend integration (PostgreSQL + pgvector required)
cd backend && set TEST_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/atarag_test && python -m pytest -q
```
