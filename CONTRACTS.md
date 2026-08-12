# ATA-Rag — Ekipler Arası Sözleşmeler (Contracts)

Bu dosya, 5 kişinin birbirini beklemeden paralel çalışabilmesi için sabitlenen arayüzleri tanımlar.
Bir sözleşmeyi değiştirmeden önce ilgili taraflarla konuşun.

## 1. Chunk formatı (Kişi 1 → Kişi 2)

Kişi 1'in (Crawler) ürettiği `scraper/data/chunks.jsonl` dosyası, satır başına bir JSON objesi (JSON Lines) içerir:

```json
{
  "id": "sha1 hash of url+section (deterministic)",
  "url": "https://akademiata.pl/admissions",
  "title": "Admissions 2026",
  "section": "Admissions > Required documents",
  "markdown": "## Required documents\n\n...",
  "faculty": "Computer Science",
  "language": "pl",
  "lastUpdated": "2026-07-28T00:00:00Z",
  "source": "website"
}
```

Kişi 2 bu dosyayı okuyup embedding üretip `chunks` tablosuna yazar.

## 2. DB şeması (Kişi 2 — SQLAlchemy / PostgreSQL / pgvector)

```sql
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  title text,
  markdown text,
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  chunk text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now()
);

create table query_logs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  language text not null,
  answer text not null,
  confidence double precision,
  latency_ms integer,
  created_at timestamptz default now()
);

create table answer_feedback (
  id uuid primary key default gen_random_uuid(),
  query_log_id uuid not null unique references query_logs(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

Persistence: SQLAlchemy ORM + PostgreSQL. Tablolar uygulama başlangıcında `metadata.create_all` ile oluşturulur (Alembic henüz yok).

## 3. API sözleşmesi (Kişi 2 → Kişi 3)

Base path: FastAPI. Frontend `NEXT_PUBLIC_API_BASE_URL` altına istek atar.

### 3.1 `POST /api/chat`

Request:

```json
{
  "question": "What about part-time studies?",
  "language": "en",
  "history": [
    { "role": "user", "content": "How much is Computer Science tuition?" },
    { "role": "assistant", "content": "…" }
  ]
}
```

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `question` | string | evet | Güncel soru (trim, max 1500) |
| `language` | string | evet | UI dili |
| `history` | array | hayır | Önceki tamamlanmış turlar, max **8** mesaj, role `user`/`assistant`, content max 2000 |

Response (her başarılı yanıtta `query_id` zorunlu):

```json
{
  "answer": "…",
  "sources": [
    {
      "title": "Computer Science Tuition",
      "url": "https://akademiata.pl/kalkulator-czesnego/",
      "section": "Fees",
      "excerpt": "Optional excerpt",
      "source_type": "website"
    }
  ],
  "confidence": 0.84,
  "latency_ms": 1430,
  "query_id": "backend-generated-query-id"
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `confidence` | number \| null | 0.0–1.0 (UI: ≥0.75 high, ≥0.5 medium) — wire değeri sayısal |
| `query_id` | string | Backend `query_logs.id` — feedback bu id ile bağlanır |

History, RAG retrieval sorgusuna bağlam sağlar; asistan cevapları gerçek kaynak sayılmaz.

### 3.2 `POST /api/feedback`

Request:

```json
{
  "query_id": "backend-query-id",
  "rating": "up",
  "comment": null
}
```

Response:

```json
{
  "success": true,
  "feedback_id": "feedback-record-id"
}
```

Bilinmeyen `query_id` → **404**. Aynı `query_id` için tekrar oy → mevcut satır **UPDATE** (`query_log_id` UNIQUE).

## 4. Env / config

| Değişken | Sahip | Açıklama |
|---|---|---|
| `BASE_URL` | Scraper | `https://akademiata.pl` |
| `DATABASE_URL` | Backend | `postgresql+asyncpg://…` |
| `OPENAI_API_KEY` | Backend | Embeddings + LLM |
| `EMBEDDING_MODEL` | Backend | OpenAI embedding model (default `text-embedding-3-small`) |
| `EMBEDDING_DIMENSIONS` | Backend | pgvector column width (default `1536`) |
| `RETRIEVAL_MIN_SCORE` | Backend | Minimum chunk similarity 0–1 (default `0.35`) |
| `CORS_ORIGINS` | Backend | Virgülle ayrılmış origin listesi, örn. `http://localhost:3000` |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | Backend base URL |
| `NEXT_PUBLIC_USE_MOCK_API` | Frontend | Mock adapter |

CORS: explicit origin listesi; `allow_origins=["*"]` + `allow_credentials=True` kullanılmaz.

## Domain

Onaylanmış domain: **`https://akademiata.pl`**. `ata.edu.pl` ve `akademiata.edu.pl` kullanılmaz.

## RAG entegrasyonu

`/api/chat` → history-aware retrieval query → pgvector search (chunks below `RETRIEVAL_MIN_SCORE` discarded) → grounded answer → `query_logs` persist → `query_id` döner.

Yeterli doğrulanmış chunk yoksa yanıt:

```json
{
  "answer": "I couldn't find enough verified information in the indexed university sources to answer this question.",
  "sources": [],
  "confidence": null,
  "latency_ms": 42,
  "query_id": "…"
}
```

Sentetik demo kaynak veya uydurma güven skoru dönülmez.
