# ATA-Rag

RAG tabanlı bir üniversite asistanı — [akademiata.pl](https://akademiata.pl) (Akademia Techniczno-Artystyczna) sitesinden otomatik olarak toplanan bilgilerle, öğrencilerin sorularını (kabul, ücretler, programlar, iletişim vb.) doğal dilde yanıtlar.

## Nasıl çalışır

```
akademiata.pl
      │
  Scraper (Python)                 scraper/
      │  HTML → Markdown → başlık bazlı chunk'lar
      ▼
scraper/data/chunks.jsonl
      │
  Embedding + ingestion
      ▼
PostgreSQL + pgvector (Supabase)
      │
      ▼
FastAPI backend                    backend/
      │  soru → embed → pgvector arama → LLM ile
      │  kaynaklı, soru diliyle uyumlu cevap üretimi
      ▼
Next.js frontend (+ dashboard)     frontend/, dashboard/
      │
   Kullanıcı
```

## Klasör yapısı

| Klasör | İçerik |
|---|---|
| `scraper/` | Web crawler, HTML→Markdown, chunking, PDF çıkarma |
| `backend/` | FastAPI: `/api/chat`, `/api/feedback`, pgvector retrieval, LLM cevap üretimi |
| `frontend/` | Next.js sohbet arayüzü |
| `dashboard/` | Yönetim paneli bileşenleri (frontend'e entegre edilecek, bkz. `dashboard/INTEGRATION.md`) |
| `observability/` | Backend için metrik/log paketi |
| `integration/` | Geçici mock API + dashboard sözleşmesi (`CONTRACTS_DASHBOARD.md`) |
| `coolify/` | Deployment dokümantasyonu |
| `docker-compose.yml` / `docker-compose.prod.yml` | Yerel/production servis orkestrasyon |

Sözleşmeler (chunk formatı, DB şeması, API contract) için: [CONTRACTS.md](CONTRACTS.md)

## Hızlı başlangıç (yerel geliştirme)

**Scraper**
```bash
cd scraper
pip install -r requirements.txt
python main.py --mode live
```

**Backend**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env   # DATABASE_URL, OPENAI_API_KEY doldurulmalı
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # http://localhost:3000
```

`NEXT_PUBLIC_USE_MOCK_API=false` yapılırsa frontend gerçek backend'e bağlanır.

## Test

```bash
cd scraper && pytest
cd backend && pytest   # bazı testler için gerçek Postgres (TEST_DATABASE_URL) gerekir
cd frontend && npm test
```

## Deployment

Coolify üzerinden deploy talimatları için [coolify/DEPLOYMENT.md](coolify/DEPLOYMENT.md).

## Ekip

| Alan | Kapsam |
|---|---|
| Crawler & Veri Toplama | Site/PDF crawl, temizleme, chunk'lama |
| Backend & RAG | FastAPI, pgvector, embedding, LLM entegrasyonu |
| Frontend | Next.js sohbet arayüzü |
| Dashboard & Deployment | Yönetim paneli, Docker, Coolify |
| Test & QA | Uçtan uca test, doğruluk/performans kontrolü
