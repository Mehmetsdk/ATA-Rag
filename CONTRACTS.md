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

Alan açıklamaları:

| Alan | Tip | Açıklama |
|---|---|---|
| `id` | string | Deterministik hash — aynı içerik tekrar crawl edilirse aynı id üretilir (dedup/diff için) |
| `url` | string | Chunk'ın geldiği sayfanın tam URL'i |
| `title` | string | Sayfa başlığı |
| `section` | string | Heading breadcrumb'ı (`H1 > H2 > H3`) |
| `markdown` | string | Bu chunk'a ait temiz markdown içerik |
| `faculty` | string \| null | Tespit edilebiliyorsa fakülte adı |
| `language` | `"pl"` \| `"en"` | Otomatik dil tespiti |
| `lastUpdated` | ISO 8601 string | Crawl zamanı |
| `source` | `"website"` \| `"pdf"` | İçeriğin kaynağı |

Kişi 2 bu dosyayı okuyup embedding üretip `chunks` tablosuna yazacak.

## 2. DB şeması (Kişi 2 sahiplenir, herkes referans alır)

```sql
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

Not: Bu branch'te query log / feedback repository varsayılan olarak SQLite kullanır (`backend/app/repository.py`). Postgres + pgvector RAG henüz bağlı değildir.

## 3. API sözleşmesi (Kişi 2 → Kişi 3)

Base path: FastAPI uygulaması. Frontend `NEXT_PUBLIC_API_BASE_URL` altına istek atar.

### 3.1 `POST /api/chat`

Request (JSON):

```json
{
  "question": "How much is Computer Science tuition?",
  "language": "en",
  "history": [
    { "role": "user", "content": "How do I apply?" },
    { "role": "assistant", "content": "Complete the online application form…" }
  ]
}
```

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `question` | string | evet | Güncel soru (trim, boş olamaz, max 1500 karakter) |
| `language` | string | evet | UI dili, örn. `"en"` |
| `history` | array | hayır | Bu sorudan **önceki** tamamlanmış turlar. Yoksa `[]`. En fazla **8** mesaj. Her öğe: `role` (`"user"` \| `"assistant"`) + `content` (max 2000 karakter, boş olamaz) |

Response (JSON) — başarılı her yanıtta `query_id` zorunludur:

```json
{
  "answer": "According to the published fee schedule…",
  "sources": [
    {
      "title": "Computer Science Tuition",
      "url": "https://akademiata.pl/kalkulator-czesnego/",
      "section": "Fees",
      "excerpt": "Optional source excerpt",
      "source_type": "website"
    }
  ],
  "confidence": 0.84,
  "latency_ms": 1430,
  "query_id": "backend-generated-id"
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `answer` | string | Yanıt metni |
| `sources` | array | `title` + `url` zorunlu; `section`, `excerpt`, `source_type` opsiyonel |
| `confidence` | number \| null | `0.0`–`1.0`. UI etiketi: ≥0.75 high, ≥0.5 medium, aksi low (wire değeri sayısal) |
| `latency_ms` | number \| null | Sunucu süre (ms) |
| `query_id` | string | Backend'in ürettiği `query_logs.id`. Feedback bu id ile bağlanır |

Streaming kullanılacaksa: Server-Sent Events (`text/event-stream`). MVP non-streaming JSON kullanır.

### 3.2 `POST /api/feedback`

Request (JSON):

```json
{
  "query_id": "backend-query-id",
  "rating": "up",
  "comment": null
}
```

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `query_id` | string | evet | `/api/chat` yanıtındaki backend `query_id` |
| `rating` | `"up"` \| `"down"` | evet | Geri bildirim |
| `comment` | string \| null | hayır | İsteğe bağlı not |

Bilinmeyen `query_id` → **404**.

Aynı `query_id` için tekrar oy → mevcut `answer_feedback` satırı **UPDATE** edilir (duplicate yok; `query_log_id` UNIQUE).

Response (JSON):

```json
{
  "success": true,
  "feedback_id": "feedback-record-id"
}
```

## 4. Env / config sözleşmesi (herkes → Kişi 4)

Kök `.env.example` şablondur; her servis kendi `.env`'ini bundan türetir.

| Değişken | Sahip | Açıklama |
|---|---|---|
| `BASE_URL` | Scraper | Crawl kök domaini: `https://akademiata.pl` |
| `DATABASE_URL` | Backend | Repository DB. Bu branch: `sqlite:///…`. Postgres URL gelecekteki RAG için ayrılmıştır |
| `OPENAI_API_KEY` | Backend | LLM / embedding (RAG bağlanınca) |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | FastAPI base URL, örn. `http://localhost:8000` |
| `NEXT_PUBLIC_USE_MOCK_API` | Frontend | `true` / `1` / `yes` ise mock adapter |

## Domain

Onaylanmış üniversite domaini: **`https://akademiata.pl`**. Mock kaynak URL'leri ve crawl hedefi bu domaini kullanır. `ata.edu.pl` ve `akademiata.edu.pl` kullanılmaz.

## RAG entegrasyon sınırı

`POST /api/chat` sözleşmesi sabittir. Bu branch'te yanıt üretimi placeholder'dır (`backend/app/chat_service.py`); embedding / pgvector retrieval / LLM henüz bağlı değildir. Query log + feedback persistence repository üzerinden çalışır.
