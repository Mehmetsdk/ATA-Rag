# ATA-Rag backend (Person 2 — SQLAlchemy / PostgreSQL / pgvector)

FastAPI service implementing [CONTRACTS.md](../CONTRACTS.md) §3 on Aysel's PR #4 architecture.

## Endpoints

- `POST /api/chat` — RAG chat with bounded `history`, returns `query_id`
- `POST /api/feedback` — `{ query_id, rating, comment? }` → `{ success, feedback_id }`

## Architecture

```
routers/          HTTP layer
services/
  history.py      context-aware retrieval query (user turns only)
  embeddings.py   OpenAI embeddings (dimensions must match schema)
  retrieval.py    pgvector similarity search + min-score filter
  chat.py         RAG orchestration + query_logs persistence
  feedback.py     atomic PostgreSQL upsert on query_log_id
models.py         SQLAlchemy ORM (documents, chunks, query_logs, answer_feedback)
db.py             async session + pgvector extension bootstrap
config.py         pydantic-settings (DATABASE_URL, CORS_ORIGINS, …)
```

## Database bootstrap

On startup, the app runs:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

then `Base.metadata.create_all`. The database user needs permission to create the extension, or an administrator must pre-install pgvector.

SQLite is not supported.

## Grounded answers

When retrieval finds no chunks above `RETRIEVAL_MIN_SCORE`, the API returns a transparent no-answer message with `sources: []` and `confidence: null`. No synthetic demo sources are returned.

## Environment

```env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/atarag
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
RETRIEVAL_MIN_SCORE=0.35
```

`EMBEDDING_DIMENSIONS` must match the pgvector column width. Changing it requires recreating the database schema.

## Local setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
cd backend
pip install -r requirements.txt

# Unit tests (no PostgreSQL)
python -m pytest -q -m "not integration"

# Full suite — integration tests skip without PostgreSQL
set TEST_DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/atarag_test
python -m pytest -q
```

Integration tests include pgvector retrieval with stubbed embeddings (no OpenAI network).
