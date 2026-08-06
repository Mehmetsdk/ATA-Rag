import time
from fastapi import APIRouter
from app.schemas import ChatRequest, ChatResponse, Source

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    start = time.perf_counter()

    # TODO: embed request.question, vector search, LLM call
    answer = "Bu bir test cevabıdır, henüz gerçek RAG bağlanmadı."
    sources = [
        Source(
            title="Örnek Sayfa",
            url="https://example-university.edu/admissions",
            section="Admissions",
            excerpt="Örnek alıntı metni...",
            source_type="website",
        )
    ]

    latency_ms = int((time.perf_counter() - start) * 1000)

    return ChatResponse(
        answer=answer,
        sources=sources,
        confidence=0.75,
        latency_ms=latency_ms,
    )