import re

from config import MAX_CHUNK_CHARS

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
MIN_CHUNK_CHARS = 150


def chunk_by_headings(markdown: str, page_title: str) -> list[dict]:
    """Split markdown into chunks along heading boundaries.

    Each chunk carries a `section` breadcrumb built from the heading
    hierarchy leading up to it, e.g. "Admissions > Required documents".
    """
    lines = markdown.splitlines()

    chunks: list[dict] = []
    stack: list[tuple[int, str]] = []  # (level, text)
    buffer: list[str] = []

    def flush():
        content = "\n".join(buffer).strip()
        if not content:
            return
        breadcrumb = " > ".join(text for _, text in stack) or page_title
        chunks.append({"section": breadcrumb, "markdown": content})

    for line in lines:
        match = HEADING_RE.match(line)
        if match:
            flush()
            buffer.clear()
            level, text = len(match.group(1)), match.group(2).strip()
            while stack and stack[-1][0] >= level:
                stack.pop()
            stack.append((level, text))
            buffer.append(line)
        else:
            buffer.append(line)
    flush()

    chunks = _dedupe_adjacent(chunks)
    chunks = _merge_small_siblings(chunks)
    return _split_oversized(chunks)


def _dedupe_adjacent(chunks: list[dict]) -> list[dict]:
    """Drop a chunk if it's an exact repeat of the immediately preceding one.

    Handles carousel/slider markup that renders the same card twice in the
    raw HTML (e.g. a desktop + mobile duplicate of a program listing).
    """
    result: list[dict] = []
    for chunk in chunks:
        if result and result[-1]["section"] == chunk["section"] and result[-1]["markdown"] == chunk["markdown"]:
            continue
        result.append(chunk)
    return result


def _merge_small_siblings(chunks: list[dict]) -> list[dict]:
    """Combine consecutive short leaf chunks that share the same parent heading.

    A page listing dozens of programme cards (one heading each, a couple of
    words of body text) produces near-empty, low-signal chunks. Grouping
    them under their shared parent keeps retrieval meaningful.
    """
    merged: list[dict] = []
    for chunk in chunks:
        parent = chunk["section"].rsplit(" > ", 1)[0] if " > " in chunk["section"] else chunk["section"]
        content = chunk["markdown"]
        is_short = len(content) < MIN_CHUNK_CHARS

        if (
            merged
            and merged[-1]["_short_group"]
            and merged[-1]["_parent"] == parent
            and is_short
            and len(merged[-1]["markdown"]) + len(content) <= MAX_CHUNK_CHARS
        ):
            # Previous entry is itself a short sibling (or a group of them) —
            # safe to fold this one in and relabel with their shared parent.
            merged[-1]["markdown"] += "\n\n" + content
            merged[-1]["section"] = parent
        else:
            # Previous entry is a long standalone chunk (or there is none) —
            # never fold into it, or its precise breadcrumb would be lost.
            merged.append({"section": chunk["section"], "markdown": content, "_parent": parent, "_short_group": is_short})

    for m in merged:
        del m["_parent"]
        del m["_short_group"]
    return merged


def _split_oversized(chunks: list[dict]) -> list[dict]:
    result: list[dict] = []
    for chunk in chunks:
        content = chunk["markdown"]
        if len(content) <= MAX_CHUNK_CHARS:
            result.append(chunk)
            continue
        paragraphs = content.split("\n\n")
        part: list[str] = []
        part_len = 0
        for para in paragraphs:
            if part_len + len(para) > MAX_CHUNK_CHARS and part:
                result.append({"section": chunk["section"], "markdown": "\n\n".join(part).strip()})
                part, part_len = [], 0
            part.append(para)
            part_len += len(para)
        if part:
            result.append({"section": chunk["section"], "markdown": "\n\n".join(part).strip()})
    return result
