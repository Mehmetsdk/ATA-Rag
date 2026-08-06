from fastapi import FastAPI
from app.routers import chat

app = FastAPI(title="ATA RAG Backend")

app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}