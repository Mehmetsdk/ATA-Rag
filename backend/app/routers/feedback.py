from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas import FeedbackRequest, FeedbackResponse
from app.services.feedback import UnknownQueryError, handle_feedback

router = APIRouter()


@router.post("/api/feedback", response_model=FeedbackResponse)
async def feedback(
    request: FeedbackRequest,
    session: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    try:
        return await handle_feedback(request, session)
    except UnknownQueryError:
        raise HTTPException(status_code=404, detail="Unknown query_id") from None
