"""CORS origin parsing and middleware configuration tests."""

from __future__ import annotations

import importlib

import pytest

from app.config import parse_cors_origins


def test_parse_single_origin() -> None:
    assert parse_cors_origins("http://localhost:3000") == ["http://localhost:3000"]


def test_parse_multiple_origins() -> None:
    raw = "http://localhost:3000, https://ata-chat.example.com"
    assert parse_cors_origins(raw) == [
        "http://localhost:3000",
        "https://ata-chat.example.com",
    ]


def test_parse_strips_whitespace_and_ignores_empty() -> None:
    raw = " http://localhost:3000 , , https://app.example.com "
    assert parse_cors_origins(raw) == [
        "http://localhost:3000",
        "https://app.example.com",
    ]


def test_parse_ignores_wildcard() -> None:
    assert parse_cors_origins("*") == []
    assert parse_cors_origins("http://localhost:3000,*") == ["http://localhost:3000"]


def test_middleware_uses_explicit_origins_not_wildcard(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://ata-chat.example.com",
    )
    import app.config as config_module
    import app.main as main_module

    importlib.reload(config_module)
    importlib.reload(main_module)

    cors_middleware = None
    for middleware in main_module.app.user_middleware:
        if middleware.cls.__name__ == "CORSMiddleware":
            cors_middleware = middleware
            break

    assert cors_middleware is not None
    options = cors_middleware.kwargs
    assert options["allow_origins"] == [
        "http://localhost:3000",
        "https://ata-chat.example.com",
    ]
    assert options["allow_credentials"] is True
    assert "*" not in options["allow_origins"]
