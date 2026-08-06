# ATA-Rag

akademiata.pl için RAG tabanlı üniversite chatbot'u.

## Ekip

| # | Kişi | Kapsam |
|---|------|--------|
| 1 | Mehmet | Crawler & Veri Toplama (`scraper/`) |
| 2 | Aysel | Backend & RAG (FastAPI, pgvector, LLM) |
| 3 | Can | Frontend (Next.js chat arayüzü) |
| 4 | Sami | Dashboard, Observability, Docker/Coolify deployment |
| 5 | Alperen | Test & QA |

Ekipler arası arayüzler (chunk formatı, DB şeması, API sözleşmesi) için [CONTRACTS.md](CONTRACTS.md) dosyasına bakın.

## Deadline

MVP teslim: Pazartesi 20:00 (kesin tarih Piotr'dan teyit edilecek).

## Klasör yapısı

```
scraper/    # Kişi 1
backend/    # Kişi 2 — POST /api/chat + POST /api/feedback (+ query log / feedback persistence)
frontend/   # Kişi 3
infra/      # Kişi 4
```

## Hızlı doğrulama

```bash
# Frontend
cd frontend && npm ci && npm run typecheck && npm run lint && npm test && npm run build

# Backend (contract + integration; isolated SQLite in tests)
cd backend && pip install -r requirements.txt && python -m pytest -q
```

## Not

Bu branch'te backend **query log + feedback** repository'sini (SQLite) ve HTTP sözleşmesini sağlar. Embedding / pgvector retrieval / LLM henüz bağlı değildir — ayrıntı için `backend/README.md` ve `CONTRACTS.md`.
