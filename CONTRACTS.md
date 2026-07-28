# ATA-Rag — Ekipler Arası Sözleşmeler (Contracts)

Bu dosya, 5 kişinin birbirini beklemeden paralel çalışabilmesi için sabitlenen arayüzleri tanımlar.
Bir sözleşmeyi değiştirmeden önce ilgili taraflarla konuşun.

## 1. Chunk formatı (Kişi 1 → Kişi 2)

Kişi 1'in (Crawler) ürettiği `scraper/data/chunks.jsonl` dosyası, satır başına bir JSON objesi (JSON Lines) içerir:

```json
{
  "id": "sha1 hash of url+section (deterministic)",
  "url": "https://university.edu/admissions",
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
```

## 3. API sözleşmesi (Kişi 2 → Kişi 3)

`POST /chat`

Request:
```json
{ "question": "Bilgisayar mühendisliği ücreti ne kadar?", "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}] }
```

Response:
```json
{
  "answer": "...",
  "sources": [{"title": "Tuition Fees", "url": "...", "section": "..."}],
  "confidence": "high" | "low"
}
```

Streaming kullanılacaksa: Server-Sent Events (`text/event-stream`), her token bir `data: {...}\n\n` event'i.

## 4. Env / config sözleşmesi (herkes → Kişi 4)

`.env.example` içinde tanımlı, her servis kendi `.env`'ini bu şablondan türetir.

## Açık nokta

`BASE_URL` (crawl edilecek gerçek üniversite domaini) henüz netleşmedi. Netleşene kadar `scraper` mock veriyle çalışıyor. Netleşince `scraper/config.py` içindeki `BASE_URL` güncellenecek.
