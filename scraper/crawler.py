import time
import urllib.robotparser
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from config import (
    BASE_URL,
    IGNORE_PATTERNS,
    INCLUDE_KEYWORDS,
    MAX_PAGES,
    REQUEST_DELAY_SECONDS,
    REQUEST_TIMEOUT_SECONDS,
    USER_AGENT,
)


def _allowed_by_robots(base_url: str) -> urllib.robotparser.RobotFileParser:
    rp = urllib.robotparser.RobotFileParser()
    robots_url = urljoin(base_url, "/robots.txt")
    rp.set_url(robots_url)
    try:
        resp = requests.get(robots_url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT_SECONDS)
        if resp.status_code == 200:
            rp.parse(resp.text.splitlines())
        else:
            rp.parse([])
    except requests.RequestException:
        rp.parse([])
    return rp


def _normalize(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.rstrip("/") or "/"
    return parsed._replace(path=path, fragment="").geturl()


def _is_in_scope(url: str, base_domain: str) -> bool:
    parsed = urlparse(url)
    if parsed.netloc and parsed.netloc != base_domain:
        return False
    if any(pattern in parsed.path for pattern in IGNORE_PATTERNS):
        return False
    if not INCLUDE_KEYWORDS:
        return True
    path_lower = parsed.path.lower()
    return path_lower == "/" or any(keyword in path_lower for keyword in INCLUDE_KEYWORDS)


def crawl(base_url: str = BASE_URL, max_pages: int = MAX_PAGES):
    """BFS crawl of base_url, yielding (url, html) for in-scope pages.

    Respects robots.txt and a polite delay between requests.
    """
    base_domain = urlparse(base_url).netloc
    robots = _allowed_by_robots(base_url)
    headers = {"User-Agent": USER_AGENT}

    seen = {_normalize(base_url)}
    queue = [_normalize(base_url)]
    fetched = 0

    session = requests.Session()
    session.headers.update(headers)

    while queue and fetched < max_pages:
        url = queue.pop(0)

        if not robots.can_fetch(USER_AGENT, url):
            continue

        try:
            resp = session.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
            resp.raise_for_status()
        except requests.RequestException:
            continue

        content_type = resp.headers.get("Content-Type", "")
        if "text/html" not in content_type:
            continue

        html = resp.text
        yield url, html
        fetched += 1

        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            next_url = urljoin(url, a["href"])
            normalized = _normalize(next_url)
            if normalized not in seen and _is_in_scope(next_url, base_domain):
                seen.add(normalized)
                queue.append(normalized)

        time.sleep(REQUEST_DELAY_SECONDS)
