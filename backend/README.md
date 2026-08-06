# ATA-Rag backend (Person 2 contract surface)

FastAPI service implementing [CONTRACTS.md](../CONTRACTS.md) §3:

- `POST /api/chat` — accepts `question`, `language`, and prior-turn `history`; returns `query_id`
- `POST /api/feedback` — `{ query_id, rating, comment? }` → `{ success, feedback_id }`

## Persistence

Query logs and answer feedback are stored through `ChatRepository` (SQLite by default).

| Table | Purpose |
| --- | --- |
| `query_logs` | One row per successful chat response (`id` = `query_id`) |
| `answer_feedback` | One row per query (`query_log_id` UNIQUE FK); repeat votes UPDATE |

Default database file: `backend/data/atarag.sqlite`. Override with:

```env
DATABASE_URL=sqlite:///C:/path/to/atarag.sqlite
```

Postgres / pgvector is **not** used by this repository on this branch. `DATABASE_URL=postgresql://…` is reserved for the future RAG stack and is rejected by `ChatRepository` until that integration exists.

## Retrieval boundary (honest)

This package does **not** implement embedding retrieval, pgvector search, or LLM generation. `app/chat_service.py` returns a placeholder answer so the HTTP + persistence contract can be verified. Wire real RAG by replacing `build_placeholder_answer` without changing the request/response shapes.

## Local setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: [http://localhost:8000/health](http://localhost:8000/health)

Frontend:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false
```

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

Tests inject an isolated in-memory SQLite repository via `tests/conftest.py`.
