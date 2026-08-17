"""Dashboard analytics endpoint — aggregated stats from query_logs."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import AnswerFeedback, QueryLog

router = APIRouter()

NO_ANSWER_TEXT = (
    "I couldn't find enough verified information in the indexed university sources "
    "to answer this question."
)


@router.get("/api/dashboard/stats")
async def get_dashboard_stats(session: AsyncSession = Depends(get_db)) -> dict:
    since = datetime.now(timezone.utc) - timedelta(days=30)

    total_result = await session.execute(
        select(func.count(QueryLog.id)).where(QueryLog.created_at >= since)
    )
    total_questions = total_result.scalar() or 0

    unanswered_result = await session.execute(
        select(func.count(QueryLog.id)).where(
            QueryLog.created_at >= since,
            QueryLog.answer == NO_ANSWER_TEXT,
        )
    )
    unanswered_count = unanswered_result.scalar() or 0

    avg_confidence_result = await session.execute(
        select(func.avg(QueryLog.confidence)).where(
            QueryLog.created_at >= since,
            QueryLog.confidence.is_not(None),
        )
    )
    avg_confidence = avg_confidence_result.scalar()

    avg_latency_result = await session.execute(
        select(func.avg(QueryLog.latency_ms)).where(
            QueryLog.created_at >= since,
            QueryLog.latency_ms.is_not(None),
        )
    )
    avg_latency_ms = avg_latency_result.scalar()

    top_questions_result = await session.execute(
        select(QueryLog.question, func.count(QueryLog.id).label("count"))
        .where(QueryLog.created_at >= since)
        .group_by(QueryLog.question)
        .order_by(func.count(QueryLog.id).desc())
        .limit(10)
    )
    top_questions = [
        {"question": row.question, "count": row.count}
        for row in top_questions_result.all()
    ]

    unanswered_questions_result = await session.execute(
        select(QueryLog.question, QueryLog.created_at)
        .where(
            QueryLog.created_at >= since,
            QueryLog.answer == NO_ANSWER_TEXT,
        )
        .order_by(QueryLog.created_at.desc())
        .limit(20)
    )
    unanswered_questions = [
        {"question": row.question, "createdAt": row.created_at.isoformat()}
        for row in unanswered_questions_result.all()
    ]

    feedback_result = await session.execute(
        select(AnswerFeedback.rating, func.count(AnswerFeedback.id))
        .join(QueryLog, QueryLog.id == AnswerFeedback.query_log_id)
        .where(QueryLog.created_at >= since)
        .group_by(AnswerFeedback.rating)
    )
    feedback_counts = {rating: count for rating, count in feedback_result.all()}

    recent_result = await session.execute(
        select(
            QueryLog.id,
            QueryLog.question,
            QueryLog.language,
            QueryLog.confidence,
            QueryLog.latency_ms,
            QueryLog.created_at,
        )
        .where(QueryLog.created_at >= since)
        .order_by(QueryLog.created_at.desc())
        .limit(20)
    )
    recent_queries = [
        {
            "id": str(row.id),
            "question": row.question,
            "language": row.language,
            "confidence": row.confidence,
            "latencyMs": row.latency_ms,
            "createdAt": row.created_at.isoformat(),
        }
        for row in recent_result.all()
    ]

    return {
        "totalQuestions": total_questions,
        "unansweredCount": unanswered_count,
        "unansweredRate": (
            round(unanswered_count / total_questions * 100, 1) if total_questions else 0
        ),
        "avgConfidence": round(avg_confidence, 2) if avg_confidence is not None else None,
        "avgLatencyMs": round(avg_latency_ms) if avg_latency_ms is not None else None,
        "topQuestions": top_questions,
        "unansweredQuestions": unanswered_questions,
        "feedbackCounts": {
            "up": feedback_counts.get("up", 0),
            "down": feedback_counts.get("down", 0),
        },
        "recentQueries": recent_queries,
        "periodDays": 30,
    }