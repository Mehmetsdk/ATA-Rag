import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db import AsyncSessionLocal, Base, engine
from app.models import Chunk, Document
from app.services.embeddings import create_embeddings

PROJECT_ROOT = Path(__file__).resolve().parents[3]
CHUNKS_PATH = PROJECT_ROOT / "scraper" / "data" / "chunks.jsonl"
BATCH_SIZE = 50
MIN_CHUNK_CHARS = 50


def _normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    # simple dedup: if the raw markdown is exactly two identical halves, trim to first half
    raw_markdown = record.get("markdown") or record.get("content") or record.get("text") or ""
    half = len(raw_markdown) // 2
    if half > 20 and raw_markdown[:half].strip() == raw_markdown[half:].strip():
        raw_markdown = raw_markdown[:half].strip()

    return {
        "title": record.get("title") or record.get("Title") or "",
        "url": record.get("url") or record.get("URL") or "",
        "section": record.get("section") or record.get("Section") or "",
        "markdown": raw_markdown,
        "faculty": record.get("faculty"),
        "language": record.get("language"),
        "lastUpdated": record.get("lastUpdated"),
        "source": record.get("source") or record.get("source_type") or "website",
    }


async def _document_exists(session: AsyncSession, url: str) -> bool:
    result = await session.execute(
        select(Document.id).where(Document.url == url).limit(1)
    )
    return result.scalar_one_or_none() is not None


async def ingest() -> tuple[int, int]:
    if not CHUNKS_PATH.exists():
        raise FileNotFoundError(f"chunks.jsonl not found at: {CHUNKS_PATH}")

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    raw_records: list[dict[str, Any]] = []

    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        for line_number, line in enumerate(file, start=1):
            stripped = line.strip()
            if not stripped:
                continue
            try:
                record = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSON on line {line_number}: {exc}")

            normalized = _normalize_record(record)
            if not normalized["url"] or not normalized["markdown"]:
                continue

            if len(normalized["markdown"].strip()) < MIN_CHUNK_CHARS:
                continue

            grouped[normalized["url"]].append(normalized)
            raw_records.append(normalized)

    documents_added = 0
    chunks_added = 0

    async with AsyncSessionLocal() as session:
        async with session.begin():
            for url, records in grouped.items():
                if await _document_exists(session, url):
                    continue

                document = Document(
                    title=records[0]["title"],
                    url=url,
                    source_type=records[0]["source"],
                    markdown=records[0]["markdown"],
                )
                session.add(document)
                await session.flush()

                content_batch = [record["markdown"] for record in records]
                embeddings = await create_embeddings(content_batch)

                for record, embedding in zip(records, embeddings):
                    metadata = {
                        "section": record.get("section"),
                        "faculty": record.get("faculty"),
                        "language": record.get("language"),
                        "lastUpdated": record.get("lastUpdated"),
                        "source": record.get("source"),
                    }
                    chunk = Chunk(
                        document_id=document.id,
                        chunk=record["markdown"],
                        meta=metadata,
                        embedding=embedding,
                    )
                    session.add(chunk)
                    chunks_added += 1

                documents_added += 1

    return documents_added, chunks_added


async def main() -> None:
    added_documents, added_chunks = await ingest()
    print(f"Ingestion completed. Documents added: {added_documents}, Chunks added: {added_chunks}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
