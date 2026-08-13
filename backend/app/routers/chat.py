import time
from typing import List

from fastapi import APIRouter
from sqlalchemy import select

from openai import AsyncOpenAI

from app.config import settings
from app.db import AsyncSessionLocal
from app.models import Chunk, Document
from app.schemas import ChatRequest, ChatResponse, Source
from app.services.embeddings import create_embeddings

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    start = time.perf_counter()

    # 1) Create embedding for the question
    try:
        embeddings = await create_embeddings([request.question])
    except Exception as e:
        print(f"[CHAT DEBUG] embedding failed: {type(e).__name__}: {e}")
        embeddings = []

    if not embeddings:
        latency_ms = int((time.perf_counter() - start) * 1000)
        return ChatResponse(
            answer="Üzgünüm, embedding oluşturulamadı.",
            sources=[],
            confidence=0.0,
            latency_ms=latency_ms,
        )

    query_embedding = embeddings[0]

    # 2) Vector search in DB for top-k chunks
    top_k = 5
    rows = []
    async with AsyncSessionLocal() as session:
        try:
            # Prefer high-level cosine_distance if available
            try:
                stmt = (
                    select(Chunk, Document)
                    .join(Document)
                    .order_by(Chunk.embedding.cosine_distance(query_embedding))
                    .limit(top_k)
                )
                result = await session.execute(stmt)
                rows = result.all()
            except Exception as e:
                print(f"[CHAT DEBUG] cosine_distance search failed: {type(e).__name__}: {e}")
                # Fallback to raw operator <=> via SQL expression
                try:
                    expr = Chunk.embedding.op('<=>')(query_embedding)
                    stmt = (
                        select(Chunk, Document)
                        .join(Document)
                        .order_by(expr)
                        .limit(top_k)
                    )
                    result = await session.execute(stmt)
                    rows = result.all()
                except Exception as e:
                    print(f"[CHAT DEBUG] raw operator search failed: {type(e).__name__}: {e}")
                    rows = []
        except Exception as e:
            print(f"[CHAT DEBUG] vector search outer failure: {type(e).__name__}: {e}")
            rows = []

    # 3) Build context and sources
    context_parts: List[str] = []
    sources: List[Source] = []
    for row in rows:
        # row may be (Chunk, Document) tuple
        chunk_obj = row[0]
        doc_obj = row[1]
        excerpt = chunk_obj.chunk[:500]
        meta = chunk_obj.meta or {}
        section = meta.get('section') or ''
        sources.append(
            Source(
                title=doc_obj.title,
                url=doc_obj.url,
                section=section,
                excerpt=excerpt,
                source_type=doc_obj.source_type,
            )
        )
        context_parts.append(f"Title: {doc_obj.title}\nURL: {doc_obj.url}\nSection: {section}\nText: {chunk_obj.chunk}")

    context = "\n\n---\n\n".join(context_parts)

    # 4) Call OpenAI chat completion with the context
    system_prompt = (
        "Sen ATA üniversitesi için bir asistansın, sadece verilen context'e dayanarak Türkçe/Lehçe/İngilizce cevap ver, "
        "context'te yoksa bilmediğini söyle. Kısa ve net cevap ver."
    )

    user_prompt = f"Context:\n{context}\n\nQuestion: {request.question}"

    answer = "Üzgünüm, cevap üretilemedi."
    confidence = 0.0

    if settings.OPENAI_API_KEY:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        try:
            resp = await client.chat.completions.create(
                model=getattr(settings, 'CHAT_MODEL', 'gpt-4o-mini'),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                max_tokens=512,
            )
            # try several possible response shapes
            try:
                answer = resp.choices[0].message.content
            except Exception:
                try:
                    answer = resp.choices[0].message['content']
                except Exception:
                    answer = getattr(resp, 'text', str(resp))
            confidence = 0.9 if rows else 0.5
        except Exception as e:
            print(f"[CHAT DEBUG] LLM call failed: {type(e).__name__}: {e}")
            answer = "LLM çağrısı başarısız oldu."

    latency_ms = int((time.perf_counter() - start) * 1000)

    return ChatResponse(
        answer=answer,
        sources=sources,
        confidence=confidence,
        latency_ms=latency_ms,
    )