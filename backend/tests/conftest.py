"""Pytest fixtures — isolated in-memory SQLite repository per test."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repository import ChatRepository, set_repository


@pytest.fixture()
def repository() -> ChatRepository:
    repo = ChatRepository(database_url="sqlite:///:memory:")
    set_repository(repo)
    yield repo
    set_repository(None)
    repo.close()


@pytest.fixture()
def client(repository: ChatRepository) -> TestClient:
    return TestClient(app)
