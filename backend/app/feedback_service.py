"""Feedback service — resolves query_id via the repository."""

from __future__ import annotations

from app.repository import ChatRepository
from app.schemas import FeedbackRequest, FeedbackResponse


class UnknownQueryError(LookupError):
    """Raised when feedback references a query_id that is not in query_logs."""


def handle_feedback(request: FeedbackRequest, repository: ChatRepository) -> FeedbackResponse:
    try:
        record = repository.upsert_feedback(
            query_id=request.query_id,
            rating=request.rating,
            comment=request.comment,
        )
    except LookupError as exc:
        raise UnknownQueryError(str(exc)) from exc

    return FeedbackResponse(success=True, feedback_id=record.id)
