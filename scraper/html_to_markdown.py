from bs4 import BeautifulSoup
from markdownify import markdownify as md

NOISE_TAGS = ["script", "style", "nav", "footer", "header", "noscript", "iframe", "svg"]
NOISE_SELECTORS = [".cookie-banner", ".site-nav", "#menu", ".breadcrumbs"]


def extract_title(soup: BeautifulSoup) -> str:
    if soup.title and soup.title.string:
        return soup.title.string.strip()
    h1 = soup.find("h1")
    if h1:
        return h1.get_text(strip=True)
    return ""


def html_to_clean_markdown(html: str) -> tuple[str, str]:
    soup = BeautifulSoup(html, "html.parser")

    title = extract_title(soup)

    for tag_name in NOISE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()
    for selector in NOISE_SELECTORS:
        for tag in soup.select(selector):
            tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.body or soup
    markdown = md(
        str(main),
        heading_style="ATX",
        convert=["h1", "h2", "h3", "h4", "p", "li", "ul", "ol", "table"],
        escape_asterisks=False,
        escape_underscores=False,
        escape_misc=False,
    )

    # collapse excessive blank lines
    lines = [line.rstrip() for line in markdown.splitlines()]
    cleaned: list[str] = []
    blank_run = 0
    for line in lines:
        if line.strip() == "":
            blank_run += 1
            if blank_run > 1:
                continue
        else:
            blank_run = 0
        cleaned.append(line)

    return title, "\n".join(cleaned).strip()
