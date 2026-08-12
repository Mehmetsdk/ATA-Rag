from chunker import chunk_by_headings

LONG_FILLER = "Lorem ipsum dolor sit amet consectetur. " * 5  # > MIN_CHUNK_CHARS (150)


def test_two_consecutive_short_siblings_are_merged():
    markdown = (
        f"# Root\n\n{LONG_FILLER}\n\n"
        "## CardA\nshort a\n\n"
        "## CardB\nshort b\n"
    )
    chunks = chunk_by_headings(markdown, page_title="Root")

    # intro chunk stays separate, CardA + CardB fold into one "Root" chunk
    assert [c["section"] for c in chunks] == ["Root", "Root"]
    merged = chunks[1]
    assert "CardA" in merged["markdown"]
    assert "CardB" in merged["markdown"]


def test_long_chunk_followed_by_short_sibling_stays_separate():
    """Regression test: a long chunk must never absorb a short sibling and
    lose its own precise section breadcrumb (see PR #2 review)."""
    markdown = (
        f"# Studia I stopnia\n\n{LONG_FILLER}\n\n"
        f"## BigProgram\n\n{LONG_FILLER}\n\n"
        "## SmallCard\nshort\n"
    )
    chunks = chunk_by_headings(markdown, page_title="Studia I stopnia")

    sections = [c["section"] for c in chunks]
    assert "Studia I stopnia > BigProgram" in sections, (
        f"BigProgram lost its precise section, got: {sections}"
    )


def test_single_short_chunk_keeps_precise_section():
    markdown = f"# Root\n\n{LONG_FILLER}\n\n## OnlyCard\nshort\n"
    chunks = chunk_by_headings(markdown, page_title="Root")

    assert chunks[-1]["section"] == "Root > OnlyCard"


def test_adjacent_identical_chunks_are_deduped():
    markdown = (
        f"# Root\n\n{LONG_FILLER}\n\n"
        "## Program\nDetails A\n\n"
        "## Program\nDetails A\n\n"
        "## Program\nDetails B\n"
    )
    chunks = chunk_by_headings(markdown, page_title="Root")

    # Robust to whatever small-sibling merging happens downstream: the true
    # duplicate ("Details A" twice in the source) must collapse to one
    # occurrence, while distinct content ("Details B") is preserved once.
    all_text = "\n".join(c["markdown"] for c in chunks)
    assert all_text.count("Details A") == 1
    assert all_text.count("Details B") == 1
