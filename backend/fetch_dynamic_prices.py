import asyncio
import re
from playwright.async_api import async_playwright
from app.db import get_session_factory, init_db
from app.services.embeddings import embed_text
from sqlalchemy import text

PLACEHOLDER_PATTERNS = [
    "Loading current prices",
    "Pricing coming soon",
]

PRICE_REGEX = re.compile(r'(\d[\d,\.]*)\s*(EUR|€|PLN|zł)')


async def get_pages_needing_price():
    await init_db()
    factory = get_session_factory()
    async with factory() as session:
        result = await session.execute(
            text("""
                SELECT DISTINCT d.id, d.url FROM chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE c.chunk ILIKE '%Loading current prices%'
                   OR c.chunk ILIKE '%Pricing coming soon%'
            """)
        )
        return result.fetchall()


async def fetch_rendered_text(playwright, url: str) -> str | None:
    browser = await playwright.chromium.launch()
    page = await browser.new_page()
    try:
        await page.goto(url, wait_until="networkidle", timeout=45000)
        try:
            await page.wait_for_selector(
                "text=Loading current prices",
                state="detached",
                timeout=10000,
            )
        except Exception:
            pass
        return await page.inner_text("body")
    finally:
        await browser.close()


async def update_chunks_for_document(session, doc_id, price_text: str) -> int:
    result = await session.execute(
        text("SELECT id, chunk FROM chunks WHERE document_id = :doc_id"),
        {"doc_id": doc_id},
    )
    rows = result.fetchall()
    updated = 0

    for chunk_id, chunk_text in rows:
        if not any(p in chunk_text for p in PLACEHOLDER_PATTERNS):
            continue

        new_text = chunk_text
        for p in PLACEHOLDER_PATTERNS:
            new_text = new_text.replace(
                p,
                f"Tuition fee: {price_text}",
            )
        new_text = re.sub(
            r"We will publish the updated pricing for this program soon\.?",
            "",
            new_text,
        )

        new_embedding = await embed_text(new_text)

        await session.execute(
            text("UPDATE chunks SET chunk = :chunk, embedding = :emb WHERE id = :id"),
            {"chunk": new_text, "emb": str(new_embedding), "id": chunk_id},
        )
        updated += 1

    return updated


async def main():
    pages = await get_pages_needing_price()
    print(f"{len(pages)} sayfa fiyat icin kontrol edilecek.")

    factory = get_session_factory()
    updated_pages = 0
    skipped_pages = 0
    total_chunks_updated = 0

    async with async_playwright() as p:
        for i, (doc_id, url) in enumerate(pages):
            print(f"[{i+1}/{len(pages)}] Kontrol ediliyor: {url}")
            try:
                rendered = await fetch_rendered_text(p, url)
            except Exception as e:
                print(f"  HATA (goto): {type(e).__name__}")
                skipped_pages += 1
                continue

            match = PRICE_REGEX.search(rendered or "")
            if not match:
                print(f"  Fiyat bulunamadi, atlaniyor.")
                skipped_pages += 1
                continue

            price_text = match.group(0)
            print(f"  BULUNDU: {price_text}")

            async with factory() as session:
                try:
                    n = await update_chunks_for_document(session, doc_id, price_text)
                    await session.commit()
                    total_chunks_updated += n
                    updated_pages += 1
                    print(f"  {n} chunk guncellendi.")
                except Exception as e:
                    print(f"  HATA (db update): {type(e).__name__}: {e}")
                    skipped_pages += 1

    print()
    print(f"BITTI. Guncellenen sayfa: {updated_pages}, Atlanan sayfa: {skipped_pages}, Toplam chunk guncellendi: {total_chunks_updated}")


if __name__ == "__main__":
    asyncio.run(main())
