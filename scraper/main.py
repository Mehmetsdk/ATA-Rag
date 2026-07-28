import argparse
import glob
import hashlib
import json
import os
import re
from datetime import datetime, timezone

from langdetect import detect

from chunker import chunk_by_headings
from config import BASE_URL
from crawler import crawl
from html_to_markdown import html_to_clean_markdown

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MOCK_DIR = os.path.join(os.path.dirname(__file__), "mock_data")
OUTPUT_PATH = os.path.join(DATA_DIR, "chunks.jsonl")

FACULTY_KEYWORDS = {
    "computer science": "Computer Science",
    "informatyka": "Computer Science",
    "engineering": "Engineering",
    "inzynieria": "Engineering",
    "art": "Fine Arts",
    "sztuka": "Fine Arts",
}


def detect_language(text: str) -> str:
    try:
        lang = detect(text)
        return lang if lang in ("pl", "en") else "pl"
    except Exception:
        return "pl"


def detect_faculty(title: str, section: str) -> str | None:
    haystack = f"{title} {section}".lower()
    for keyword, faculty in FACULTY_KEYWORDS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", haystack):
            return faculty
    return None


def make_id(url: str, section: str) -> str:
    return hashlib.sha1(f"{url}::{section}".encode("utf-8")).hexdigest()


def build_records(url: str, html: str, source: str = "website") -> list[dict]:
    title, markdown = html_to_clean_markdown(html)
    chunks = chunk_by_headings(markdown, page_title=title)

    now = datetime.now(timezone.utc).isoformat()
    records = []
    for chunk in chunks:
        records.append(
            {
                "id": make_id(url, chunk["section"]),
                "url": url,
                "title": title,
                "section": chunk["section"],
                "markdown": chunk["markdown"],
                "faculty": detect_faculty(title, chunk["section"]),
                "language": detect_language(chunk["markdown"]),
                "lastUpdated": now,
                "source": source,
            }
        )
    return records


def run_mock():
    os.makedirs(DATA_DIR, exist_ok=True)
    all_records = []
    for path in sorted(glob.glob(os.path.join(MOCK_DIR, "*.html"))):
        url = f"https://example-university.edu/{os.path.splitext(os.path.basename(path))[0]}"
        with open(path, "r", encoding="utf-8") as f:
            html = f.read()
        all_records.extend(build_records(url, html))

    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        for record in all_records:
            out.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"{len(all_records)} chunk yazildi -> {OUTPUT_PATH}")


def run_live(base_url: str):
    os.makedirs(DATA_DIR, exist_ok=True)
    all_records = []
    pages = 0
    for url, html in crawl(base_url=base_url):
        all_records.extend(build_records(url, html))
        pages += 1

    with open(OUTPUT_PATH, "w", encoding="utf-8") as out:
        for record in all_records:
            out.write(json.dumps(record, ensure_ascii=False) + "\n")

    print(f"{pages} sayfa crawl edildi, {len(all_records)} chunk yazildi -> {OUTPUT_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ATA-Rag crawler pipeline")
    parser.add_argument("--mode", choices=["mock", "live"], default="mock")
    parser.add_argument("--base-url", default=BASE_URL)
    args = parser.parse_args()

    if args.mode == "mock":
        run_mock()
    else:
        run_live(args.base_url)
