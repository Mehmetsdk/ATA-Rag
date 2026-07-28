# Scraper (Kişi 1 — Crawler & Veri Toplama)

Üniversite sitesini crawl edip, HTML'i temiz Markdown'a çevirir, başlıklara göre chunk'lara ayırır ve `CONTRACTS.md`'de tanımlı JSON formatında `data/chunks.jsonl` dosyasına yazar.

## Kurulum

```bash
pip install -r requirements.txt
```

## Çalıştırma

Gerçek domain netleşene kadar mock veriyle (bkz. `mock_data/`) test edin:

```bash
python main.py --mode mock
```

Gerçek domain netleşince `config.py` içindeki `BASE_URL`'i güncelleyip:

```bash
python main.py --mode live
# veya
python main.py --mode live --base-url https://gercek-domain.edu.pl
```

## Dosyalar

- `config.py` — hedef domain, include/ignore path kuralları, crawl limitleri
- `crawler.py` — robots.txt'ye uyan, aynı domain içinde kalan BFS crawler
- `html_to_markdown.py` — nav/footer/script temizleyip HTML'i Markdown'a çevirir
- `chunker.py` — heading breadcrumb'ı ile (`H1 > H2`) chunk'lara böler, uzun chunk'ları paragraf sınırından ikiye ayırır
- `pdf_extract.py` — metin tabanlı PDF'lerden markdown çıkarır (taranmış/görsel PDF'ler için OCR yok — zaman kalırsa eklenir)
- `main.py` — pipeline'ı orkestre eder, `data/chunks.jsonl` üretir

## Bilinen sınırlamalar / yapılacaklar

- [ ] Gerçek `BASE_URL` netleşince `config.py` güncellenecek
- [ ] `INCLUDE_KEYWORDS` gerçek site menüsüne göre kalibre edilecek
- [ ] PDF linklerini otomatik keşfedip `pdf_extract.py`'a yönlendiren adım eklenecek
- [ ] Taranmış (image-only) PDF'ler için OCR (örn. `pytesseract`) — zaman kalırsa
