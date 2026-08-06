"""
SQLite-backed repository for query logs and answer feedback.

This is the persistence boundary for chat/feedback on this branch. It does not
implement pgvector retrieval or LLM answering — only query logging and feedback
storage behind a repository abstraction tests and routes share.
"""

from __future__ import annotations

import sqlite3
import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from urllib.parse import unquote, urlparse

from app.config import get_database_url

Rating = Literal["up", "down"]


@dataclass(frozen=True)
class QueryLogRecord:
    id: str
    question: str
    language: str
    answer: str
    confidence: float | None
    latency_ms: int | None
    created_at: str


@dataclass(frozen=True)
class FeedbackRecord:
    id: str
    query_log_id: str
    rating: Rating
    comment: str | None
    created_at: str
    updated_at: str


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sqlite_path_from_url(database_url: str) -> str | None:
    """
    Return SQLite filesystem path, ':memory:', or None if not a sqlite URL.
    """
    if database_url == ":memory:" or database_url == "sqlite:///:memory:":
        return ":memory:"

    if database_url.startswith("sqlite:///"):
        raw = database_url[len("sqlite:///") :]
        if raw == ":memory:":
            return ":memory:"
        return unquote(raw)

    parsed = urlparse(database_url)
    if parsed.scheme == "sqlite":
        path = unquote(parsed.path or "")
        if path in {"", "/:memory:", ":memory:"}:
            return ":memory:"
        # urlparse gives "/C:/..." on Windows absolute paths — strip leading slash.
        if len(path) >= 3 and path[0] == "/" and path[2] == ":":
            path = path[1:]
        return path or ":memory:"

    return None


class ChatRepository:
    """Repository abstraction for query_logs + answer_feedback."""

    def __init__(self, database_url: str | None = None) -> None:
        self._database_url = database_url or get_database_url()
        self._lock = threading.RLock()
        self._conn = self._connect(self._database_url)
        self._migrate()

    @staticmethod
    def _connect(database_url: str) -> sqlite3.Connection:
        sqlite_path = _sqlite_path_from_url(database_url)
        if sqlite_path is None:
            raise RuntimeError(
                "This branch's ChatRepository uses SQLite only. "
                f"Unsupported DATABASE_URL scheme for query logs/feedback: {database_url!r}. "
                "Set DATABASE_URL to sqlite:///… (or leave unset for the default file)."
            )

        if sqlite_path != ":memory:":
            Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)

        # check_same_thread=False: FastAPI may use threadpool; guarded by RLock.
        conn = sqlite3.connect(sqlite_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _migrate(self) -> None:
        with self._lock:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS query_logs (
                  id TEXT PRIMARY KEY,
                  question TEXT NOT NULL,
                  language TEXT NOT NULL,
                  answer TEXT NOT NULL,
                  confidence REAL,
                  latency_ms INTEGER,
                  created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS answer_feedback (
                  id TEXT PRIMARY KEY,
                  query_log_id TEXT NOT NULL UNIQUE
                    REFERENCES query_logs(id) ON DELETE CASCADE,
                  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
                  comment TEXT,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );
                """
            )
            self._conn.commit()

    def create_query_log(
        self,
        *,
        question: str,
        language: str,
        answer: str,
        confidence: float | None,
        latency_ms: int | None,
        query_id: str | None = None,
    ) -> QueryLogRecord:
        record = QueryLogRecord(
            id=query_id or str(uuid.uuid4()),
            question=question,
            language=language,
            answer=answer,
            confidence=confidence,
            latency_ms=latency_ms,
            created_at=_utc_now(),
        )
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO query_logs (
                  id, question, language, answer, confidence, latency_ms, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.question,
                    record.language,
                    record.answer,
                    record.confidence,
                    record.latency_ms,
                    record.created_at,
                ),
            )
            self._conn.commit()
        return record

    def get_query_log(self, query_id: str) -> QueryLogRecord | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM query_logs WHERE id = ?",
                (query_id,),
            ).fetchone()
        if row is None:
            return None
        return QueryLogRecord(
            id=row["id"],
            question=row["question"],
            language=row["language"],
            answer=row["answer"],
            confidence=row["confidence"],
            latency_ms=row["latency_ms"],
            created_at=row["created_at"],
        )

    def get_feedback_for_query(self, query_id: str) -> FeedbackRecord | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM answer_feedback WHERE query_log_id = ?",
                (query_id,),
            ).fetchone()
        if row is None:
            return None
        return FeedbackRecord(
            id=row["id"],
            query_log_id=row["query_log_id"],
            rating=row["rating"],
            comment=row["comment"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def upsert_feedback(
        self,
        *,
        query_id: str,
        rating: Rating,
        comment: str | None = None,
    ) -> FeedbackRecord:
        """
        Create or update feedback for a query_log.

        Raises LookupError when query_id is unknown.
        """
        if self.get_query_log(query_id) is None:
            raise LookupError(f"Unknown query_id: {query_id}")

        now = _utc_now()
        existing = self.get_feedback_for_query(query_id)
        with self._lock:
            if existing is None:
                record = FeedbackRecord(
                    id=str(uuid.uuid4()),
                    query_log_id=query_id,
                    rating=rating,
                    comment=comment,
                    created_at=now,
                    updated_at=now,
                )
                self._conn.execute(
                    """
                    INSERT INTO answer_feedback (
                      id, query_log_id, rating, comment, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        record.id,
                        record.query_log_id,
                        record.rating,
                        record.comment,
                        record.created_at,
                        record.updated_at,
                    ),
                )
            else:
                record = FeedbackRecord(
                    id=existing.id,
                    query_log_id=query_id,
                    rating=rating,
                    comment=comment,
                    created_at=existing.created_at,
                    updated_at=now,
                )
                self._conn.execute(
                    """
                    UPDATE answer_feedback
                    SET rating = ?, comment = ?, updated_at = ?
                    WHERE query_log_id = ?
                    """,
                    (record.rating, record.comment, record.updated_at, query_id),
                )
            self._conn.commit()
        return record

    def count_feedback(self) -> int:
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*) AS c FROM answer_feedback"
            ).fetchone()
        return int(row["c"])

    def reset(self) -> None:
        """Clear all rows — for tests only."""
        with self._lock:
            self._conn.execute("DELETE FROM answer_feedback")
            self._conn.execute("DELETE FROM query_logs")
            self._conn.commit()

    def close(self) -> None:
        with self._lock:
            self._conn.close()


_repository: ChatRepository | None = None
_repository_lock = threading.Lock()


def get_repository() -> ChatRepository:
    global _repository
    with _repository_lock:
        if _repository is None:
            _repository = ChatRepository()
        return _repository


def set_repository(repository: ChatRepository | None) -> None:
    """Replace the process-wide repository (tests)."""
    global _repository
    with _repository_lock:
        if _repository is not None and repository is not _repository:
            try:
                _repository.close()
            except Exception:
                pass
        _repository = repository
