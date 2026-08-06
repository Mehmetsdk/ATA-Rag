"""Integration tests for chat history, query logs, and feedback."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import MAX_HISTORY_MESSAGES
from app.repository import ChatRepository


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_chat_with_valid_history(client: TestClient, repository: ChatRepository) -> None:
    history = [
        {"role": "user", "content": "How do I apply?"},
        {
            "role": "assistant",
            "content": "Complete the online application form and upload documents.",
        },
    ]
    response = client.post(
        "/api/chat",
        json={
            "question": "What documents are required?",
            "language": "en",
            "history": history,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["query_id"]
    assert "2 prior message" in body["answer"]
    assert all(item["url"].startswith("https://akademiata.pl") for item in body["sources"])
    log = repository.get_query_log(body["query_id"])
    assert log is not None
    assert log.question == "What documents are required?"
    assert log.language == "en"
    assert log.answer == body["answer"]


def test_chat_without_history_first_question(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={"question": "Where is the dean's office?", "language": "en"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "prior message" not in body["answer"]
    assert body["query_id"]
    assert body["latency_ms"] is not None and body["latency_ms"] >= 1


def test_chat_rejects_invalid_history_role(client: TestClient) -> None:
    response = client.post(
        "/api/chat",
        json={
            "question": "Hello",
            "language": "en",
            "history": [{"role": "system", "content": "Nope"}],
        },
    )
    assert response.status_code == 422


def test_chat_rejects_over_limit_history(client: TestClient) -> None:
    history = [
        {"role": "user" if i % 2 == 0 else "assistant", "content": f"message {i}"}
        for i in range(MAX_HISTORY_MESSAGES + 1)
    ]
    response = client.post(
        "/api/chat",
        json={"question": "Next question?", "language": "en", "history": history},
    )
    assert response.status_code == 422


def test_successful_response_query_log_exists(
    client: TestClient, repository: ChatRepository
) -> None:
    body = client.post(
        "/api/chat",
        json={"question": "Scholarships?", "language": "en", "history": []},
    ).json()
    log = repository.get_query_log(body["query_id"])
    assert log is not None
    assert log.id == body["query_id"]
    assert log.confidence == body["confidence"]
    assert log.latency_ms == body["latency_ms"]


def test_feedback_up_and_down(client: TestClient, repository: ChatRepository) -> None:
    query_id = client.post(
        "/api/chat",
        json={"question": "Tuition?", "language": "en"},
    ).json()["query_id"]

    up = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "up", "comment": None},
    )
    assert up.status_code == 200
    assert up.json()["success"] is True
    assert up.json()["feedback_id"]
    assert repository.get_feedback_for_query(query_id).rating == "up"

    down = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "down", "comment": "Needs sources"},
    )
    assert down.status_code == 200
    assert down.json()["success"] is True
    assert down.json()["feedback_id"] == up.json()["feedback_id"]
    assert repository.count_feedback() == 1
    stored = repository.get_feedback_for_query(query_id)
    assert stored is not None
    assert stored.rating == "down"
    assert stored.comment == "Needs sources"


def test_unknown_query_id_returns_404(client: TestClient) -> None:
    response = client.post(
        "/api/feedback",
        json={
            "query_id": "00000000-0000-4000-8000-000000000099",
            "rating": "up",
            "comment": None,
        },
    )
    assert response.status_code == 404


def test_invalid_rating_rejected(client: TestClient) -> None:
    query_id = client.post(
        "/api/chat",
        json={"question": "Q", "language": "en"},
    ).json()["query_id"]
    response = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "meh"},
    )
    assert response.status_code == 422


def test_repeat_vote_updates_one_record(
    client: TestClient, repository: ChatRepository
) -> None:
    query_id = client.post(
        "/api/chat",
        json={"question": "Repeat vote?", "language": "en"},
    ).json()["query_id"]

    first = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "up"},
    ).json()
    second = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "down", "comment": "changed"},
    ).json()

    assert first["feedback_id"] == second["feedback_id"]
    assert repository.count_feedback() == 1
    assert repository.get_feedback_for_query(query_id).rating == "down"


def test_end_to_end_chat_then_feedback(client: TestClient, repository: ChatRepository) -> None:
    chat = client.post(
        "/api/chat",
        json={
            "question": "How much is Computer Science tuition?",
            "language": "en",
            "history": [],
        },
    )
    assert chat.status_code == 200
    query_id = chat.json()["query_id"]

    feedback = client.post(
        "/api/feedback",
        json={"query_id": query_id, "rating": "down", "comment": None},
    )
    assert feedback.status_code == 200
    body = feedback.json()
    assert body == {"success": True, "feedback_id": body["feedback_id"]}
    assert repository.get_query_log(query_id) is not None
    assert repository.get_feedback_for_query(query_id) is not None
