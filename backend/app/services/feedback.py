"""Answer feedback persistence — atomic PostgreSQL upsert by query_log_id."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnswerFeedback, QueryLog
from app.schemas import FeedbackRequest, FeedbackResponse


class UnknownQueryError(LookupError):
    """Raised when feedback references a query_id that is not in query_logs."""


async def handle_feedback(
    request: FeedbackRequest,
    session: AsyncSession,
) -> FeedbackResponse:
    try:
        query_uuid = uuid.UUID(request.query_id)
    except ValueError as exc:
        raise UnknownQueryError(f"Unknown query_id: {request.query_id}") from exc

    query_log = await session.get(QueryLog, query_uuid)
    if query_log is None:
        raise UnknownQueryError(f"Unknown query_id: {request.query_id}")

    now = datetime.now(timezone.utc)
    insert_stmt = pg_insert(AnswerFeedback).values(
        id=uuid.uuid4(),
        query_log_id=query_uuid,
        rating=request.rating,
        comment=request.comment,
        created_at=now,
        updated_at=now,
    )
    upsert_stmt = insert_stmt.on_conflict_do_update(
        index_elements=[AnswerFeedback.query_log_id],
        set_={
            "rating": request.rating,
            "comment": request.comment,
            "updated_at": now,
        },
    ).returning(AnswerFeedback.id)

    result = await session.execute(upsert_stmt)
    feedback_id = result.scalar_one()

    return FeedbackResponse(success=True, feedback_id=str(feedback_id))
