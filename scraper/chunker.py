import re

from config import MAX_CHUNK_CHARS

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")


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

    return _split_oversized(chunks)


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
