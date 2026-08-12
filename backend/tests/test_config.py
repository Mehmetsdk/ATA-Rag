"""Settings validation tests."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.config import DEFAULT_EMBEDDING_DIMENSIONS, Settings, get_embedding_dimensions


def test_default_embedding_dimensions() -> None:
    assert DEFAULT_EMBEDDING_DIMENSIONS == 1536
    assert get_embedding_dimensions() == 1536


def test_rejects_non_positive_embedding_dimensions(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_DIMENSIONS", "0")
    with pytest.raises(ValidationError):
        Settings()


def test_rejects_invalid_retrieval_min_score(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RETRIEVAL_MIN_SCORE", "1.5")
    with pytest.raises(ValidationError):
        Settings()
