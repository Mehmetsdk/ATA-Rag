# ATA-Rag

[akademiata.pl](https://akademiata.pl) (Akademia Techniczno-Artystyczna) için RAG tabanlı bir üniversite asistanı. Öğrenciler ve adaylar kabul, ücretler, programlar, iletişim gibi konularda doğal dilde soru sorar; sistem cevabı yalnızca sitenin gerçek içeriğinden, kaynak göstererek üretir.

## Nasıl çalışır

```
akademiata.pl
      │
  Scraper (Python)                          scraper/
      │  HTML → temiz Markdown → başlık bazlı chunk'lar
      ▼
scraper/data/chunks.jsonl
      │
  Embedding (OpenAI) + ingestion
      ▼
PostgreSQL + pgvector (Supabase)
      │
      ▼
FastAPI backend                             backend/
      │  soru → embed → pgvector benzerlik araması
      │  → LLM ile kaynaklı, soru diliyle uyumlu cevap
      │  → query_logs + answer_feedback kaydı
      ▼
Next.js frontend (chat + /dashboard)         frontend/
      │
   Kullanıcı
```

Kaynak sitenin içeriği ağırlıklı olarak **Lehçe**; backend soruyu hangi dilde sorulduysa (İngilizce/Lehçe) o dilde, Lehçe kaynaklardan sentezleyerek cevaplar.

## Repo yapısı

| Klasör | İçerik |
|---|---|
| `scraper/` | Web crawler, HTML→Markdown, başlık bazlı chunking, PDF çıkarma |
| `backend/` | FastAPI: `/api/chat`, `/api/feedback`, `/api/dashboard/stats`, pgvector retrieval, LLM cevap üretimi |
| `frontend/` | Next.js sohbet arayüzü + `/dashboard` rotası (entegre edildi) |
| `dashboard/` | Yönetim paneli bileşenlerinin orijinal kaynağı (artık `frontend/src/app/dashboard`'a taşındı) |
| `observability/` | Backend için opsiyonel metrik/log paketi (bkz. Bilinen eksikler) |
| `integration/` | Dashboard API sözleşmesi (`CONTRACTS_DASHBOARD.md`), geçici mock server |
| `coolify/` | Coolify deployment dokümantasyonu |
| `docker-compose.yml` / `docker-compose.prod.yml` | Servis orkestrasyonu (bkz. Bilinen eksikler) |

Ekipler arası sözleşmeler (chunk formatı, DB şeması, `/api/chat` ve `/api/feedback` contract'ı) için: **[CONTRACTS.md](CONTRACTS.md)**

## Hızlı başlangıç (yerel geliştirme)

**1. Scraper — veri topla**
```bash
cd scraper
pip install -r requirements.txt
python main.py --mode live        # gerçek domain: config.py > BASE_URL
```
Çıktı: `scraper/data/chunks.jsonl`

**2. Backend — DB + RAG**
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env           # DATABASE_URL (Postgres+pgvector), OPENAI_API_KEY doldurulmalı
uvicorn app.main:app --reload --port 8000
```
İlk açılışta `CREATE EXTENSION IF NOT EXISTS vector` ve tablolar otomatik oluşturulur. `chunks.jsonl`'ın embed edilip DB'ye yüklenmesi ayrı bir ingestion adımıdır (bkz. `backend/README.md`).

**3. Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                       # http://localhost:3000
```
`NEXT_PUBLIC_USE_MOCK_API=false` + `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` ile gerçek backend'e bağlanır; `true` ile mock veriyle çalışır.

Her servisin kendi `README.md`'sinde daha fazla detay var: [`scraper/README.md`](scraper/README.md), [`backend/README.md`](backend/README.md), [`frontend/README.md`](frontend/README.md).

## Test

```bash
cd scraper  && pip install -r requirements-dev.txt && pytest
cd backend  && TEST_DATABASE_URL=<postgres-url> python -m pytest -q   # DB testleri gercek Postgres ister
cd frontend && npm test
```

## Deployment

Coolify üzerinden deploy talimatları: [coolify/DEPLOYMENT.md](coolify/DEPLOYMENT.md).

**Deploy etmeden önce bilinmesi gerekenler** (bkz. aşağıdaki "Bilinen eksikler"): `docker-compose.yml`'da `backend`/`frontend` servisleri hâlâ yorum satırı halinde, `frontend/Dockerfile` henüz yok — deployment dokümanı hazır ama gerçek servisler compose dosyasına henüz bağlanmadı.

## Bilinen eksikler / yapılacaklar

- `docker-compose.yml`: `backend` ve `frontend` servisleri hâlâ devre dışı (yorumlu), sadece geçici `mock-api` aktif — Coolify'a gerçek deploy'dan önce bunların açılması gerekiyor.
- `frontend/Dockerfile` yok (`backend/Dockerfile` var).
- `observability/` paketi hazır ama backend'e henüz bağlanmadı (`/health`, `/metrics` gözlemlenebilirlik middleware'i entegre edilmedi).
- Bazı ücret/fiyat bilgileri sitede JS ile dinamik render edildiği için (`SPRAWDŹ CENNIK` butonu) düz HTML scraping bunları yakalayamıyor — ayrı bir dinamik-render aracıyla ele alınıyor (`backend/fetch_dynamic_prices.py`).
- Scraper `INCLUDE_KEYWORDS` listesi zaman zaman site menüsüne göre kalibre edilmeli.

## Ekip

| Alan | Kapsam |
|---|---|
| Crawler & Veri Toplama | Site/PDF crawl, temizleme, chunk'lama |
| Backend & RAG | FastAPI, pgvector, embedding, LLM entegrasyonu |
| Frontend | Next.js sohbet arayüzü + dashboard |
| Dashboard & Deployment | Yönetim paneli, Docker, Coolify |
| Test & QA | Uçtan uca test, doğruluk/performans kontrolü
