"""Backend configuration and history limits (CONTRACTS.md §3)."""

from __future__ import annotations

import os
from pathlib import Path

# Conversation history constraints (mirrored on the frontend).
MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_CONTENT_LENGTH = 2000
MAX_QUESTION_LENGTH = 1500

DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent.parent / "data" / "atarag.sqlite"


def get_database_url() -> str:
    """
    Resolve the repository database URL.

    This branch persists query logs and feedback via the repository abstraction.
    Default is a local SQLite file. Override with DATABASE_URL:

    - sqlite:///absolute/or/relative/path.sqlite
    - sqlite:///:memory:  (ephemeral; mainly for isolated tests)

    Postgres (postgresql://...) is reserved for the future full RAG stack and is
    not used by the current query-log / feedback repository implementation.
    """
    configured = os.environ.get("DATABASE_URL", "").strip()
    if configured:
        return configured
    return f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"
