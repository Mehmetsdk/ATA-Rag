from pypdf import PdfReader


def pdf_to_markdown(path: str) -> tuple[str, str]:
    """Extract text from a text-based PDF and return (title, markdown).

    Note: this does not OCR scanned/image-only PDFs. If a PDF yields no
    extractable text, it should be routed to an OCR step (not implemented
    here — flag such files and revisit if the deadline allows).
    """
    reader = PdfReader(path)
    title = ""
    if reader.metadata and reader.metadata.title:
        title = reader.metadata.title.strip()

    pages_text = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text.strip())

    markdown = "\n\n".join(pages_text)
    if not title:
        title = markdown.splitlines()[0][:80] if markdown else "Untitled PDF"

    return title, markdown
